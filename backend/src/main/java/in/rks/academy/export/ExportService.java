package in.rks.academy.export;

import in.rks.academy.attendance.AttendanceRecord;
import in.rks.academy.attendance.AttendanceRepository;
import in.rks.academy.billing.BillingService;
import in.rks.academy.billing.FeeQuote;
import in.rks.academy.billing.Payment;
import in.rks.academy.billing.PaymentRepository;
import in.rks.academy.common.ApiException;
import in.rks.academy.player.Player;
import in.rks.academy.player.PlayerRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Spreadsheet exports for the accountant. Each is one or two queries, whatever the row count. */
@Service
@Transactional(readOnly = true)
public class ExportService {

    /** Longest date range one export may cover. Keeps every export small and fast. */
    static final int MAX_DAYS = 366;

    private final PaymentRepository payments;
    private final PlayerRepository players;
    private final AttendanceRepository attendance;
    private final BillingService billing;

    public ExportService(PaymentRepository payments, PlayerRepository players, AttendanceRepository attendance,
                         BillingService billing) {
        this.payments = payments;
        this.players = players;
        this.attendance = attendance;
        this.billing = billing;
    }

    public byte[] payments(LocalDate from, LocalDate to) {
        checkRange(from, to);
        Csv csv = new Csv().row("Receipt", "Paid on", "Player ID", "Player", "Plan", "Period from", "Period to",
                "Plan amount", "Sibling discount", "Late fee", "Registration fee", "Adjustment", "Amount", "Mode",
                "Status", "Void reason", "Note", "Recorded by");
        for (Payment p : payments.findForExport(from, to)) {
            csv.row(p.getReceiptNo(), p.getPaidOn(), p.getPlayer().getCode(), p.getPlayer().getName(),
                    p.getPlan().getName(), p.getPeriodFrom(), p.getPeriodTo(), p.getPlanAmount(),
                    p.getSiblingDiscount(), p.getLateFee(), p.getRegistrationFee(), p.getAdjustment(),
                    p.getAmount(), p.getMode(), p.isVoided() ? "VOID" : "PAID", p.getVoidReason(), p.getNote(),
                    p.getRecordedBy() == null ? null : p.getRecordedBy().getName());
        }
        return csv.bytes();
    }

    public byte[] dues() {
        Csv csv = new Csv().row("Player ID", "Player", "Parent", "Parent mobile", "Batch", "Plan", "Period from",
                "Period to", "Days overdue", "Plan amount", "Sibling discount", "Late fee", "Registration fee",
                "Amount due");
        for (BillingService.Due d : billing.dues()) {
            Player p = d.player();
            FeeQuote q = d.quote();
            csv.row(p.getCode(), p.getName(), p.getParentName(), p.getParentMobile(), p.getBatch().getName(),
                    p.getFeePlan().getName(), q.period().from(), q.period().to(), d.daysOverdue(), q.planAmount(),
                    q.siblingDiscount(), q.lateFee(), q.registrationFee(), q.total());
        }
        return csv.bytes();
    }

    public byte[] players() {
        List<Player> list = players.findByActiveTrue().stream().sorted(Comparator.comparing(Player::getCode)).toList();
        Map<Long, BillingService.FeeState> states = billing.feeStates(list);
        LocalDate today = billing.today();
        Csv csv = new Csv().row("Player ID", "Name", "Date of birth", "Age", "Gender", "Level", "Batch", "Court",
                "Plan", "Fee status", "Parent", "Parent mobile", "School", "Joined");
        for (Player p : list) {
            csv.row(p.getCode(), p.getName(), p.getDob(), p.ageOn(today), p.getGender(), p.getLevel(),
                    p.getBatch().getName(), p.getBatch().getCourt().getName(), p.getFeePlan().getName(),
                    states.get(p.getId()).due() ? "DUE" : "PAID", p.getParentName(), p.getParentMobile(),
                    p.getSchool(), p.getJoinDate());
        }
        return csv.bytes();
    }

    public byte[] attendance(LocalDate from, LocalDate to) {
        checkRange(from, to);
        Csv csv = new Csv().row("Date", "Batch", "Court", "Player ID", "Player", "Status");
        for (AttendanceRecord a : attendance.findForExport(from, to)) {
            csv.row(a.getDate(), a.getBatch().getName(), a.getBatch().getCourt().getName(), a.getPlayer().getCode(),
                    a.getPlayer().getName(), a.getStatus());
        }
        return csv.bytes();
    }

    private static void checkRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw ApiException.badRequest("BAD_RANGE", "The start date is after the end date");
        }
        if (from.plusDays(MAX_DAYS).isBefore(to)) {
            throw ApiException.badRequest("BAD_RANGE", "Export up to one year at a time");
        }
    }
}
