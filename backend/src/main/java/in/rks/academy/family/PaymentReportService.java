package in.rks.academy.family;

import in.rks.academy.admin.AdminUserRepository;
import in.rks.academy.billing.BillingDtos.PaymentDto;
import in.rks.academy.billing.BillingDtos.QuoteDto;
import in.rks.academy.billing.BillingDtos.RecordPaymentRequest;
import in.rks.academy.billing.BillingService;
import in.rks.academy.billing.Payment;
import in.rks.academy.billing.PaymentRepository;
import in.rks.academy.billing.PaymentService;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.Refs.PlayerRef;
import in.rks.academy.config.AppProperties;
import in.rks.academy.player.Player;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.CurrentUser;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fees in the family app. The parent pays the academy's UPI ID from their own UPI app (the money never passes
 * through this system), then reports the payment with its UPI reference. The owner checks the bank and confirms
 * the report, which records an ordinary UPI payment and receipt for each child, or rejects it with a reason.
 */
@Service
@Transactional(readOnly = true)
public class PaymentReportService {

    /** How far back a payment may be reported, and how long decided reports stay on the parent's page. */
    private static final int MAX_AGE_DAYS = 60;
    private static final int SHOW_DECIDED_DAYS = 30;
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    public record ReportRequest(
            @NotBlank @Size(max = 40) String utr,
            @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal amount,
            @NotNull LocalDate paidOn) {
    }

    public record RejectRequest(@NotBlank @Size(min = 3, max = 200) String reason) {
    }

    /** {@code receiptNo} is set once the owner has confirmed the report. */
    public record ReportItemDto(PlayerRef player, LocalDate periodFrom, BigDecimal amount, String receiptNo) {
    }

    /** For parents {@code utr} shows only its last 4 characters, and the parent fields are left out. */
    public record ReportDto(long id, String utr, BigDecimal amount, LocalDate paidOn, PaymentReport.Status status,
                            OffsetDateTime reportedAt, String reviewedBy, OffsetDateTime reviewedAt,
                            String rejectReason, String parentName, String parentMobile, BigDecimal feesTotal,
                            List<ReportItemDto> items) {
    }

    /** {@code due} is null when the child is paid up; {@code reported} when it is in a waiting report. */
    public record FeeChild(PlayerRef player, QuoteDto due, LocalDate payBy, boolean reported) {
    }

    /** {@code upiId} is null when the academy hasn't set one: parents then pay at the desk. */
    public record PayTo(String upiId, String payee, String phone) {
    }

    /** {@code toReport} is the part of {@code totalDue} that no waiting report covers yet. */
    public record Fees(BigDecimal totalDue, BigDecimal toReport, List<FeeChild> children, PayTo payTo,
                       List<ReportDto> reports, List<PaymentDto> payments) {
    }

    private final PaymentReportRepository reports;
    private final ParentAccountRepository accounts;
    private final PlayerRepository players;
    private final PaymentRepository paymentRows;
    private final PaymentService payments;
    private final BillingService billing;
    private final FamilyService family;
    private final AdminUserRepository users;
    private final AppProperties props;
    private final Clock clock;

    public PaymentReportService(PaymentReportRepository reports, ParentAccountRepository accounts,
                                PlayerRepository players, PaymentRepository paymentRows, PaymentService payments,
                                BillingService billing, FamilyService family, AdminUserRepository users,
                                AppProperties props, Clock clock) {
        this.reports = reports;
        this.accounts = accounts;
        this.players = players;
        this.paymentRows = paymentRows;
        this.payments = payments;
        this.billing = billing;
        this.family = family;
        this.users = users;
        this.props = props;
        this.clock = clock;
    }

    // ---- The parent's side ----------------------------------------------------------------------------------

    /** Everything the family Fees page shows, for all of the parent's children at once. */
    public Fees fees() {
        FamilyPrincipal me = FamilyService.current();
        List<Player> children = players.findByParentMobileAndActiveTrueOrderByJoinDateAsc(me.mobile());
        Map<Long, BillingService.FeeState> states = billing.feeStates(children);
        Set<Long> reported = new HashSet<>(reports.playersInPendingReports(ids(children)));

        List<FeeChild> rows = children.stream().map(p -> {
            boolean due = states.get(p.getId()).due();
            QuoteDto quote = due ? payments.quote(p.getId(), null) : null;
            return new FeeChild(PlayerRef.of(p), quote, due ? family.payBy(quote.periodFrom()) : null,
                    reported.contains(p.getId()));
        }).toList();
        BigDecimal totalDue = sum(rows.stream().filter(r -> r.due() != null).map(r -> r.due().total()).toList());
        BigDecimal toReport = sum(rows.stream().filter(r -> r.due() != null && !r.reported())
                .map(r -> r.due().total()).toList());

        List<ReportDto> recent = reports.findRecentForParent(me.accountId(), now().minusDays(SHOW_DECIDED_DAYS))
                .stream()
                .sorted(Comparator.comparing(PaymentReport::getCreatedAt).reversed())
                .limit(5)
                .map(r -> toDto(r, false))
                .toList();
        List<PaymentDto> history = children.stream()
                .flatMap(p -> payments.forPlayer(p.getId()).stream())
                .filter(p -> !p.voided())
                .sorted(Comparator.comparing(PaymentDto::paidOn).thenComparing(PaymentDto::id).reversed())
                .limit(50)
                .toList();
        AppProperties.Academy academy = props.academy();
        String upi = academy.upiId() == null || academy.upiId().isBlank() ? null : academy.upiId().trim();
        return new Fees(totalDue, toReport, rows, new PayTo(upi, academy.upiPayee(), academy.phone()), recent,
                history);
    }

    /** Reports one UPI payment covering the fees due now for every child not already in a waiting report. */
    @Transactional
    public ReportDto report(ReportRequest req) {
        FamilyPrincipal me = FamilyService.current();
        String utr = req.utr().replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        if (!utr.matches("[A-Z0-9]{10,22}")) {
            throw ApiException.rule("UTR_INVALID",
                    "Enter the UPI reference number from your UPI app's payment details (usually 12 digits)");
        }
        LocalDate today = billing.today();
        if (req.paidOn().isAfter(today)) {
            throw ApiException.rule("PAID_ON_FUTURE", "The payment date can't be in the future");
        }
        if (req.paidOn().isBefore(today.minusDays(MAX_AGE_DAYS))) {
            throw ApiException.rule("PAID_ON_TOO_OLD",
                    "Payments older than " + MAX_AGE_DAYS + " days can't be reported here. Please contact the academy.");
        }

        ParentAccount parent = accounts.lockById(me.accountId())
                .orElseThrow(() -> ApiException.notFound("Family", "session"));
        if (reports.existsByUtrAndStatusNot(utr, PaymentReport.Status.REJECTED)) {
            throw ApiException.conflict("UTR_ALREADY_REPORTED", "This UPI reference number has already been reported");
        }
        List<Player> children = players.findByParentMobileAndActiveTrueOrderByJoinDateAsc(me.mobile());
        Map<Long, BillingService.FeeState> states = billing.feeStates(children);
        Set<Long> waiting = new HashSet<>(reports.playersInPendingReports(ids(children)));
        List<Player> unpaid = children.stream()
                .filter(p -> states.get(p.getId()).due() && !waiting.contains(p.getId()))
                .toList();
        if (unpaid.isEmpty()) {
            throw ApiException.conflict("NOTHING_TO_REPORT", waiting.isEmpty()
                    ? "There are no unpaid fees to report"
                    : "Your payment is already reported and waiting for the academy to confirm it");
        }

        PaymentReport report = new PaymentReport();
        report.setParent(parent);
        report.setUtr(utr);
        report.setAmount(req.amount().setScale(2, RoundingMode.HALF_UP));
        report.setPaidOn(req.paidOn());
        for (Player p : unpaid) {
            // Quoted for the day the parent paid, so a late fee is charged only if they paid late.
            QuoteDto quote = payments.quote(p.getId(), req.paidOn());
            PaymentReportItem item = new PaymentReportItem();
            item.setPlayer(p);
            item.setPeriodFrom(quote.periodFrom());
            item.setAmount(quote.total());
            report.addItem(item);
        }
        return toDto(reports.saveAndFlush(report), false);
    }

    // ---- The owner's side -----------------------------------------------------------------------------------

    /** Waiting reports (oldest first), then the ones decided in the last 30 days (newest first). */
    public List<ReportDto> forReview() {
        return reports.findForReview(now().minusDays(SHOW_DECIDED_DAYS)).stream()
                .sorted(Comparator.comparing((PaymentReport r) -> r.getStatus() != PaymentReport.Status.PENDING)
                        .thenComparing(PaymentReportService::reviewOrder))
                .map(r -> toDto(r, true))
                .toList();
    }

    public long pendingCount() {
        return reports.countByStatus(PaymentReport.Status.PENDING);
    }

    /**
     * Confirms a report: records each child's fee as a UPI payment dated the day the parent paid, with a receipt.
     * If the parent paid a different total, the difference goes on the last child's receipt as an adjustment.
     * Refused when any of those fees has been collected meanwhile, so nothing is ever recorded twice.
     */
    @Transactional
    public ReportDto confirm(long id) {
        PaymentReport report = pending(id);
        List<PaymentReportItem> items = report.getItems();
        BigDecimal difference = report.getAmount()
                .subtract(sum(items.stream().map(PaymentReportItem::getAmount).toList()));
        String note = "UPI ref " + report.getUtr() + ", reported by the parent";
        for (int i = 0; i < items.size(); i++) {
            PaymentReportItem item = items.get(i);
            Player p = item.getPlayer();
            QuoteDto quote;
            try {
                quote = payments.quote(p.getId(), report.getPaidOn());
            } catch (ApiException e) {
                throw ApiException.conflict("REPORT_OUT_OF_DATE", p.getName() + ": " + e.getMessage()
                        + ". Check for a double payment, then reject this report.");
            }
            if (!quote.periodFrom().equals(item.getPeriodFrom())) {
                throw ApiException.conflict("ALREADY_COLLECTED", p.getName() + "'s fee for "
                        + item.getPeriodFrom().format(MONTH) + " has already been recorded. "
                        + "Check for a double payment, then reject this report.");
            }
            BigDecimal amount = i == items.size() - 1 ? item.getAmount().add(difference) : item.getAmount();
            if (amount.signum() < 0) {
                throw ApiException.conflict("AMOUNT_TOO_LOW", "The amount paid doesn't cover "
                        + p.getName() + "'s fee. Reject this report and ask the parent to pay the rest.");
            }
            PaymentDto paid = payments.record(new RecordPaymentRequest(p.getId(), Payment.Mode.UPI,
                    report.getPaidOn(), amount, note));
            item.setPayment(paymentRows.getReferenceById(paid.id()));
        }
        decide(report, PaymentReport.Status.CONFIRMED);
        return toDto(reports.saveAndFlush(report), true);
    }

    /** Rejects a report: nothing is recorded and the parent sees the reason and can report again. */
    @Transactional
    public ReportDto reject(long id, String reason) {
        PaymentReport report = pending(id);
        report.setRejectReason(reason.trim());
        decide(report, PaymentReport.Status.REJECTED);
        return toDto(reports.saveAndFlush(report), true);
    }

    // ---- Helpers ----------------------------------------------------------------------------------------------

    private PaymentReport pending(long id) {
        PaymentReport report = reports.lockById(id).orElseThrow(() -> ApiException.notFound("Payment report", id));
        if (report.getStatus() != PaymentReport.Status.PENDING) {
            throw ApiException.conflict("ALREADY_DECIDED",
                    "This payment report was already " + report.getStatus().name().toLowerCase(Locale.ROOT));
        }
        return report;
    }

    private void decide(PaymentReport report, PaymentReport.Status status) {
        report.setStatus(status);
        report.setReviewedAt(now());
        report.setReviewedBy(users.getReferenceById(CurrentUser.get().id()));
    }

    private ReportDto toDto(PaymentReport r, boolean forOwner) {
        List<ReportItemDto> items = r.getItems().stream()
                .map(i -> new ReportItemDto(PlayerRef.of(i.getPlayer()), i.getPeriodFrom(), i.getAmount(),
                        i.getPayment() == null ? null : i.getPayment().getReceiptNo()))
                .toList();
        String utr = forOwner ? r.getUtr() : r.getUtr().substring(r.getUtr().length() - 4);
        String parentName = forOwner && !r.getItems().isEmpty() ? r.getItems().get(0).getPlayer().getParentName() : null;
        return new ReportDto(r.getId(), utr, r.getAmount(), r.getPaidOn(), r.getStatus(), r.getCreatedAt(),
                r.getReviewedBy() == null ? null : r.getReviewedBy().getName(), r.getReviewedAt(),
                r.getRejectReason(), parentName, forOwner ? r.getParent().getMobile() : null,
                sum(r.getItems().stream().map(PaymentReportItem::getAmount).toList()), items);
    }

    /** Waiting reports oldest first; decided ones newest first. */
    private static long reviewOrder(PaymentReport r) {
        return r.getStatus() == PaymentReport.Status.PENDING
                ? r.getCreatedAt().toEpochSecond()
                : -r.getReviewedAt().toEpochSecond();
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    private static List<Long> ids(List<Player> list) {
        return list.isEmpty() ? List.of(-1L) : list.stream().map(Player::getId).toList();
    }

    private static BigDecimal sum(List<BigDecimal> amounts) {
        return amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
