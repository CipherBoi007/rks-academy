package in.rks.academy.family;

import in.rks.academy.common.ApiException;
import in.rks.academy.config.AppProperties;
import in.rks.academy.notification.WhatsAppSender;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Passwordless sign-in for parents: a 6-digit code sent on WhatsApp to the mobile number the academy has on file.
 * Codes are stored as a keyed hash, expire after 5 minutes and allow 5 attempts. A new code can be requested
 * once a minute and 5 times an hour. Responses never reveal whether a number is registered.
 */
@Service
public class FamilyAuthService {

    public record CodeRequested(String message, int retryAfterSeconds, String devCode) {
    }

    public record FamilySession(String token, Instant expiresAt) {
    }

    static final Duration CODE_TTL = Duration.ofMinutes(5);
    static final Duration RESEND_AFTER = Duration.ofSeconds(60);
    static final int MAX_CODES_PER_HOUR = 5;
    static final int MAX_ATTEMPTS = 5;
    private static final String SENT = "If this number is registered with RKS Academy, a sign-in code is on its way on WhatsApp.";
    private static final Logger log = LoggerFactory.getLogger(FamilyAuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final LoginCodeRepository codes;
    private final ParentAccountRepository accounts;
    private final PlayerRepository players;
    private final WhatsAppSender sender;
    private final JwtService jwt;
    private final String loginTemplate;
    private final byte[] hashKey;
    private final boolean exposeDevCodes;
    private final Clock clock;

    public FamilyAuthService(LoginCodeRepository codes, ParentAccountRepository accounts, PlayerRepository players,
                             WhatsAppSender sender, JwtService jwt, AppProperties props, Clock clock,
                             @Value("${app.family.expose-dev-codes:false}") boolean exposeDevCodes) {
        this.codes = codes;
        this.accounts = accounts;
        this.players = players;
        this.sender = sender;
        this.jwt = jwt;
        this.loginTemplate = props.whatsapp().cloud().loginCodeTemplate();
        this.hashKey = ("rks-login-code:" + props.jwt().secret()).getBytes(StandardCharsets.UTF_8);
        // Only ever honoured with the log provider, i.e. when nothing is really sent.
        this.exposeDevCodes = exposeDevCodes && "log".equals(sender.name());
        this.clock = clock;
    }

    @Transactional
    public CodeRequested requestCode(String mobile) {
        OffsetDateTime now = now();
        codes.findFirstByMobileOrderByCreatedAtDesc(mobile)
                .filter(last -> last.getCreatedAt().plus(RESEND_AFTER).isAfter(now))
                .ifPresent(last -> {
                    throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "WAIT",
                            "Please wait a minute before asking for another code");
                });
        if (codes.countByMobileAndCreatedAtAfter(mobile, now.minusHours(1)) >= MAX_CODES_PER_HOUR) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_CODES",
                    "Too many codes requested. Try again in an hour.");
        }
        if (!players.existsByParentMobileAndActiveTrue(mobile)) {
            // Same answer as success, so the form can't be used to find out who is a member.
            return new CodeRequested(SENT, (int) RESEND_AFTER.toSeconds(), null);
        }
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        LoginCode row = new LoginCode();
        row.setMobile(mobile);
        row.setCodeHash(hash(mobile, code));
        row.setCreatedAt(now);
        row.setExpiresAt(now.plus(CODE_TTL));
        codes.save(row);

        String text = code + " is your RKS Academy sign-in code. It expires in 5 minutes. Don't share it.";
        WhatsAppSender.Result sent = sender.send(
                new WhatsAppSender.Message("91" + mobile, loginTemplate, text, List.of(code), code));
        if (!sent.ok()) {
            log.warn("Sign-in code to {} failed: {}", mobile, sent.error());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CODE_NOT_SENT",
                    "We couldn't send the code on WhatsApp right now. Please try again shortly.");
        }
        return new CodeRequested(SENT, (int) RESEND_AFTER.toSeconds(), exposeDevCodes ? code : null);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public FamilySession verify(String mobile, String code) {
        OffsetDateTime now = now();
        LoginCode row = codes.findFirstByMobileOrderByCreatedAtDesc(mobile)
                .filter(c -> c.getUsedAt() == null && c.getExpiresAt().isAfter(now) && c.getAttempts() < MAX_ATTEMPTS)
                .orElseThrow(FamilyAuthService::invalid);
        if (!MessageDigest.isEqual(row.getCodeHash().getBytes(StandardCharsets.UTF_8),
                hash(mobile, code).getBytes(StandardCharsets.UTF_8))) {
            row.setAttempts(row.getAttempts() + 1); // kept even though we throw: see noRollbackFor
            throw invalid();
        }
        row.setUsedAt(now);
        if (!players.existsByParentMobileAndActiveTrue(mobile)) {
            throw invalid();
        }
        ParentAccount account = accounts.findByMobile(mobile).orElseGet(() -> {
            ParentAccount a = new ParentAccount();
            a.setMobile(mobile);
            return a;
        });
        account.setLastLoginAt(now);
        account = accounts.save(account);
        JwtService.IssuedToken token = jwt.issueFamily(account);
        return new FamilySession(token.token(), token.expiresAt());
    }

    /** Signs the parent out on every device. */
    @Transactional
    public void signOutEverywhere(long accountId) {
        accounts.findById(accountId).ifPresent(a -> a.setTokenVersion(a.getTokenVersion() + 1));
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CODE",
                "That code is wrong or has expired. Ask for a new one.");
    }

    /** HMAC-SHA256 keyed by the server secret, so a leaked table can't be brute-forced offline. */
    String hash(String mobile, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hashKey, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((mobile + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }

    private OffsetDateTime now() {
        return OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
