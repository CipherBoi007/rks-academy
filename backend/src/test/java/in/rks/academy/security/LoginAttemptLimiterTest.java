package in.rks.academy.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginAttemptLimiterTest {

    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-11-05T00:00:00Z");

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void locksAfterFiveFailuresAndUnlocksAfterFiveMinutes() {
        MutableClock clock = new MutableClock();
        LoginAttemptLimiter limiter = new LoginAttemptLimiter(clock);
        for (int i = 0; i < 4; i++) {
            limiter.recordFailure("9000000000");
        }
        assertThat(limiter.isLocked("9000000000")).isFalse();
        limiter.recordFailure("9000000000");
        assertThat(limiter.isLocked("9000000000")).isTrue();
        assertThat(limiter.isLocked("9000000001")).isFalse();

        clock.now = clock.now.plus(LoginAttemptLimiter.LOCKOUT).plus(Duration.ofSeconds(1));
        assertThat(limiter.isLocked("9000000000")).isFalse();
    }

    @Test
    void successResetsTheCount() {
        LoginAttemptLimiter limiter = new LoginAttemptLimiter(new MutableClock());
        for (int i = 0; i < 4; i++) {
            limiter.recordFailure("9000000000");
        }
        limiter.recordSuccess("9000000000");
        limiter.recordFailure("9000000000");
        assertThat(limiter.isLocked("9000000000")).isFalse();
    }
}
