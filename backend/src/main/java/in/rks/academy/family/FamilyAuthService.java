package in.rks.academy.family;

import in.rks.academy.auth.PinPolicy;
import in.rks.academy.auth.TemporaryPin;
import in.rks.academy.common.ApiException;
import in.rks.academy.player.Player;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.JwtService;
import in.rks.academy.security.LoginAttemptLimiter;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Parents sign in with the mobile number the academy has on file and a PIN, like staff. Nothing is sent, so
 * sign-in costs nothing however often the form is used. The owner issues a one-time PIN from the player's
 * profile; it opens nothing until the parent replaces it with their own. Five wrong PINs in a row lock the
 * number for 5 minutes, and a wrong number or PIN gets the same answer, so the form can't reveal who is a member.
 */
@Service
public class FamilyAuthService {

    /** A session, or (token null, mustChangePin true) a one-time PIN that must be replaced first. */
    public record FamilySession(String token, Instant expiresAt, boolean mustChangePin) {
    }

    /** What the owner sees on a player's profile about their parent's sign-in. */
    public record ParentLogin(String mobile, String parentName, boolean hasPin, boolean mustChangePin,
                              OffsetDateTime lastLoginAt) {
    }

    public record IssuedParentPin(ParentLogin login, String temporaryPin) {
    }

    private static final ApiException BAD_CREDENTIALS =
            new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Mobile number or PIN is incorrect");

    private final ParentAccountRepository accounts;
    private final PlayerRepository players;
    private final PasswordEncoder encoder;
    private final LoginAttemptLimiter limiter;
    private final JwtService jwt;
    private final Clock clock;

    public FamilyAuthService(ParentAccountRepository accounts, PlayerRepository players, PasswordEncoder encoder,
                             LoginAttemptLimiter limiter, JwtService jwt, Clock clock) {
        this.accounts = accounts;
        this.players = players;
        this.encoder = encoder;
        this.limiter = limiter;
        this.jwt = jwt;
        this.clock = clock;
    }

    @Transactional
    public FamilySession login(String mobile, String pin) {
        ParentAccount account = check(mobile, pin);
        return account.isMustChangePin() ? new FamilySession(null, null, true) : session(account);
    }

    /**
     * Replaces the parent's PIN, from the one-time PIN at first sign-in or later from the portal. Every other
     * device is signed out.
     */
    @Transactional
    public FamilySession setPin(String mobile, String currentPin, String newPin) {
        ParentAccount account = check(mobile, currentPin);
        if (currentPin.equals(newPin)) {
            throw ApiException.rule("PIN_UNCHANGED", "Choose a PIN different from the current one");
        }
        if (PinPolicy.isWeak(newPin)) {
            throw ApiException.rule("PIN_TOO_WEAK", "Avoid easy PINs like 111111, 123456 or 121212");
        }
        account.setPinHash(encoder.encode(newPin));
        account.setMustChangePin(false);
        account.setTokenVersion(account.getTokenVersion() + 1);
        return session(account);
    }

    /** Signs the parent out on every device. */
    @Transactional
    public void signOutEverywhere(long accountId) {
        accounts.findById(accountId).ifPresent(a -> a.setTokenVersion(a.getTokenVersion() + 1));
    }

    // ---- For the owner, from a player's profile ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public ParentLogin parentLogin(long playerId) {
        Player player = player(playerId);
        return describe(player, accounts.findByMobile(player.getParentMobile()).orElse(null));
    }

    /**
     * Issues a one-time PIN for the player's parent, shown once to the owner to pass on. It replaces any PIN the
     * parent had (so it also serves as "forgot PIN") and signs them out everywhere. Brothers and sisters share it,
     * because sign-in is per parent mobile number.
     */
    @Transactional
    public IssuedParentPin issuePin(long playerId) {
        Player player = player(playerId);
        if (!player.isActive()) {
            throw ApiException.rule("PLAYER_INACTIVE", "This player has left, so their parent can't sign in");
        }
        ParentAccount account = accounts.findByMobile(player.getParentMobile()).orElseGet(() -> {
            ParentAccount a = new ParentAccount();
            a.setMobile(player.getParentMobile());
            return a;
        });
        String pin = TemporaryPin.generate();
        account.setPinHash(encoder.encode(pin));
        account.setMustChangePin(true);
        account.setTokenVersion(account.getTokenVersion() + 1);
        account = accounts.save(account);
        limiter.recordSuccess(limitKey(account.getMobile())); // a locked-out parent can try the new PIN at once
        return new IssuedParentPin(describe(player, account), pin);
    }

    private ParentAccount check(String mobile, String pin) {
        String key = limitKey(mobile);
        if (limiter.isLocked(key)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "LOCKED", "Too many wrong PINs. Try again in 5 minutes.");
        }
        ParentAccount account = accounts.findByMobile(mobile).filter(a -> a.getPinHash() != null).orElse(null);
        if (account == null || !encoder.matches(pin, account.getPinHash())
                || !players.existsByParentMobileAndActiveTrue(mobile)) {
            limiter.recordFailure(key);
            throw BAD_CREDENTIALS;
        }
        limiter.recordSuccess(key);
        return account;
    }

    private FamilySession session(ParentAccount account) {
        account.setLastLoginAt(OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        JwtService.IssuedToken token = jwt.issueFamily(accounts.save(account));
        return new FamilySession(token.token(), token.expiresAt(), false);
    }

    private Player player(long id) {
        return players.findById(id).orElseThrow(() -> ApiException.notFound("Player", id));
    }

    private static ParentLogin describe(Player player, ParentAccount account) {
        boolean hasPin = account != null && account.getPinHash() != null;
        return new ParentLogin(player.getParentMobile(), player.getParentName(), hasPin,
                hasPin && account.isMustChangePin(), account == null ? null : account.getLastLoginAt());
    }

    /** Parents and staff can share a mobile number, so their lockouts are kept apart. */
    private static String limitKey(String mobile) {
        return "family:" + mobile;
    }
}
