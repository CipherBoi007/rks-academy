package in.rks.academy.notification;

import in.rks.academy.config.AppProperties;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.YearMonth;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Fires the month-start fee reminders (default: 09:00 IST on the 1st; see app.reminders.cron). */
@Configuration
@EnableScheduling
public class FeeReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(FeeReminderScheduler.class);

    private final FeeReminderService reminders;
    private final AppProperties props;
    private final Clock clock;

    public FeeReminderScheduler(FeeReminderService reminders, AppProperties props, Clock clock) {
        this.reminders = reminders;
        this.props = props;
        this.clock = clock;
    }

    @Scheduled(cron = "${app.reminders.cron}", zone = "Asia/Kolkata")
    public void monthStart() {
        if (!props.reminders().enabled()) {
            log.info("Fee reminders are disabled (APP_REMINDERS_ENABLED=false); skipping");
            return;
        }
        try {
            reminders.sendForCurrentMonth();
        } catch (RuntimeException e) {
            log.error("Month-start fee reminders failed", e);
        }
    }

    /**
     * Catch-up for hosts that restart or sleep (e.g. Render): if the API comes up on the 1st to 3rd of the month,
     * in the daytime (09:00 to 20:00 IST), and nothing has been sent for this month yet, the month-start run was
     * missed, so do it now. Never at night, and never twice: sends already made are skipped.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void catchUpAfterStart() {
        LocalDateTime now = LocalDateTime.now(clock);
        boolean window = now.getDayOfMonth() <= 3 && now.getHour() >= 9 && now.getHour() < 20;
        if (!window || !props.reminders().enabled()) {
            return;
        }
        FeeReminderService.MonthStatus status = reminders.status(YearMonth.from(now));
        if (status.sent() + status.failed() == 0) {
            log.info("Month-start fee reminders for {} were missed while the API was down; sending now", status.month());
            monthStart();
        }
    }
}
