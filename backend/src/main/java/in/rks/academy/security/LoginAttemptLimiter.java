package in.rks.academy.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/** Locks a mobile number for 5 minutes after 5 wrong PINs in a row; PINs are short, so this matters. */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES = 5;
    static final Duration LOCKOUT = Duration.ofMinutes(5);

    private record Attempts(int failures, Instant lockedUntil) {
    }

    private final ConcurrentHashMap<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptLimiter() {
        this(Clock.systemUTC());
    }

    LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    public boolean isLocked(String mobile) {
        Attempts a = attempts.get(mobile);
        return a != null && a.lockedUntil() != null && clock.instant().isBefore(a.lockedUntil());
    }

    public void recordFailure(String mobile) {
        attempts.compute(mobile, (k, a) -> {
            int failures = (a == null || a.lockedUntil() != null ? 0 : a.failures()) + 1;
            return failures >= MAX_FAILURES
                    ? new Attempts(0, clock.instant().plus(LOCKOUT))
                    : new Attempts(failures, null);
        });
    }

    public void recordSuccess(String mobile) {
        attempts.remove(mobile);
    }
}
