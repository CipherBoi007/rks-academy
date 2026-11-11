package in.rks.academy.security;

import in.rks.academy.admin.AdminUser;
import in.rks.academy.config.AppProperties;
import in.rks.academy.family.ParentAccount;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    public record IssuedToken(String token, Instant expiresAt) {
    }

    /**
     * What a valid token proves: who it was issued to, for which session generation, and whether the subject is a
     * staff user or a family (parent) account. The two kinds never grant each other's access.
     */
    public record TokenClaims(long subjectId, int tokenVersion, boolean family) {
    }

    private static final String FAMILY = "family";

    private static final String ISSUER = "rks-academy";
    private final SecretKey key;
    private final Duration ttl;
    private final Duration familyTtl;

    public JwtService(AppProperties props) {
        this.key = Keys.hmacShaKeyFor(props.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.ttl = props.jwt().ttl() != null ? props.jwt().ttl() : Duration.ofHours(12);
        this.familyTtl = props.jwt().familyTtl() != null ? props.jwt().familyTtl() : Duration.ofDays(30);
    }

    public IssuedToken issueFamily(ParentAccount account) {
        Instant now = Instant.now();
        Instant expiry = now.plus(familyTtl);
        String token = Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(account.getId()))
                .claim("kind", FAMILY)
                .claim("tv", account.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiry);
    }

    public IssuedToken issue(AdminUser user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(user.isMustChangePin() ? Duration.ofMinutes(15) : ttl);
        String token = Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(user.getId()))
                .claim("tv", user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiry);
    }

    /** Verifies signature, issuer and expiry. Role and status are looked up fresh by the caller. */
    public Optional<TokenClaims> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).requireIssuer(ISSUER).build()
                    .parseSignedClaims(token).getPayload();
            Integer version = claims.get("tv", Integer.class);
            boolean family = FAMILY.equals(claims.get("kind", String.class));
            return version == null ? Optional.empty()
                    : Optional.of(new TokenClaims(Long.parseLong(claims.getSubject()), version, family));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
