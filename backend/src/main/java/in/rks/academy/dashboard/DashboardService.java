package in.rks.academy.dashboard;

import in.rks.academy.attendance.AttendanceRecord;
import in.rks.academy.attendance.AttendanceRepository;
import in.rks.academy.batch.Batch;
import in.rks.academy.batch.BatchRepository;
import in.rks.academy.billing.BillingDtos.PaymentsSummary;
import in.rks.academy.billing.PaymentService;
import in.rks.academy.common.Refs.CourtRef;
import in.rks.academy.court.CourtRepository;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.CurrentUser;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    public enum SlotStatus { DONE, LIVE, UPCOMING }

    /** Fee fields are null for coaches. */
    public record Summary(LocalDate date, long activePlayers, long newThisMonth, long presentToday,
                          long markedToday, int attendancePct, BigDecimal collectedThisMonth,
                          Long paymentsThisMonth, BigDecimal pendingDues, Long duePlayers) {
    }

    public record Slot(long batchId, String batchName, LocalTime startTime, LocalTime endTime, SlotStatus status,
                       String coachName, long playerCount) {
    }

    public record CourtDay(CourtRef court, List<Slot> slots) {
    }

    private final PlayerRepository players;
    private final AttendanceRepository attendance;
    private final CourtRepository courts;
    private final BatchRepository batches;
    private final PaymentService payments;
    private final Clock clock;

    public DashboardService(PlayerRepository players, AttendanceRepository attendance, CourtRepository courts,
                            BatchRepository batches, PaymentService payments, Clock clock) {
        this.players = players;
        this.attendance = attendance;
        this.courts = courts;
        this.batches = batches;
        this.payments = payments;
        this.clock = clock;
    }

    public Summary summary() {
        LocalDate today = LocalDate.now(clock);
        long marked = attendance.countByDate(today);
        long present = attendance.countByDateAndStatus(today, AttendanceRecord.Status.PRESENT);
        int pct = marked == 0 ? 0 : (int) Math.round(present * 100.0 / marked);
        long active = players.countByActiveTrue();
        long joined = players.countByActiveTrueAndJoinDateGreaterThanEqual(today.withDayOfMonth(1));
        if (!CurrentUser.canSeeFees()) {
            return new Summary(today, active, joined, present, marked, pct, null, null, null, null);
        }
        PaymentsSummary fees = payments.summary(YearMonth.from(today));
        return new Summary(today, active, joined, present, marked, pct, fees.collected(), fees.paymentCount(),
                fees.pending(), fees.dueCount());
    }

    /** Each court's batches running today, with live status from the current time of day. */
    public List<CourtDay> todayCourts() {
        LocalDateTime now = LocalDateTime.now(clock);
        Map<Long, List<Batch>> byCourt = batches.findAllActive().stream()
                .filter(b -> b.runsOn(now.getDayOfWeek()))
                .collect(Collectors.groupingBy(b -> b.getCourt().getId()));
        return courts.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(c -> new CourtDay(CourtRef.of(c), byCourt.getOrDefault(c.getId(), List.of()).stream()
                        .map(b -> new Slot(b.getId(), b.getName(), b.getStartTime(), b.getEndTime(),
                                status(b, now.toLocalTime()), b.getCoach().getName(),
                                players.countByBatchIdAndActiveTrue(b.getId())))
                        .toList()))
                .toList();
    }

    private static SlotStatus status(Batch b, LocalTime now) {
        if (now.isBefore(b.getStartTime())) {
            return SlotStatus.UPCOMING;
        }
        return now.isBefore(b.getEndTime()) ? SlotStatus.LIVE : SlotStatus.DONE;
    }
}
