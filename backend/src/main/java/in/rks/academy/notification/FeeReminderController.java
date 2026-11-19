package in.rks.academy.notification;

import in.rks.academy.common.PageResponse;
import in.rks.academy.notification.FeeReminderService.MonthStatus;
import in.rks.academy.notification.FeeReminderService.ReminderDto;
import in.rks.academy.notification.FeeReminderService.RunResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.Clock;
import java.time.YearMonth;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Fee reminders")
@Validated
@RestController
@RequestMapping("/api/v1/notifications/fee-reminders")
@PreAuthorize("hasRole('OWNER')")
public class FeeReminderController {

    private final FeeReminderService reminders;
    private final Clock clock;

    public FeeReminderController(FeeReminderService reminders, Clock clock) {
        this.reminders = reminders;
        this.clock = clock;
    }

    @Operation(summary = "Send this month's WhatsApp fee reminders now. Already-reminded players are skipped.")
    @PostMapping
    public RunResult run() {
        return reminders.sendForCurrentMonth();
    }

    @Operation(summary = "This month's reminders; ?undelivered=true lists only those that reached nobody")
    @GetMapping
    public PageResponse<ReminderDto> list(@RequestParam(required = false) @Pattern(regexp = "\\d{4}-\\d{2}") String month,
                                          @RequestParam(defaultValue = "false") boolean undelivered,
                                          @RequestParam(defaultValue = "0") @Min(0) int page,
                                          @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return reminders.list(month(month), undelivered, page, size);
    }

    @GetMapping("/status")
    public MonthStatus status(@RequestParam(required = false) @Pattern(regexp = "\\d{4}-\\d{2}") String month) {
        return reminders.status(month(month));
    }

    private YearMonth month(String month) {
        return month == null ? YearMonth.now(clock) : YearMonth.parse(month);
    }
}
