package in.rks.academy.config;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * The single source of "now". All business dates are Asia/Kolkata calendar dates.
 * APP_DEMO_DATE is honoured only in the dev profile, so it can never shift dates in production.
 */
@Configuration
public class ClockConfig {

    public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final Logger log = LoggerFactory.getLogger(ClockConfig.class);

    @Bean
    @Profile("dev")
    Clock devClock(@Value("${APP_DEMO_DATE:}") String demoDate) {
        Clock system = Clock.system(IST);
        if (demoDate.isBlank()) {
            return system;
        }
        // Keep the real time of day so batch slots move from UPCOMING to DONE, but pin the calendar date.
        LocalDate target = LocalDate.parse(demoDate);
        Duration shift = Duration.ofDays(target.toEpochDay() - LocalDate.now(system).toEpochDay());
        log.warn("Demo clock active: business date pinned to {}", target);
        return Clock.offset(system, shift);
    }

    @Bean
    @Profile("!dev")
    Clock systemClock() {
        return Clock.system(IST);
    }
}
