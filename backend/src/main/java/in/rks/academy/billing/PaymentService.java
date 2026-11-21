package in.rks.academy.billing;

import in.rks.academy.admin.AdminUserRepository;
import in.rks.academy.billing.BillingDtos.DueDto;
import in.rks.academy.billing.BillingDtos.PaymentDto;
import in.rks.academy.billing.BillingDtos.PaymentsSummary;
import in.rks.academy.billing.BillingDtos.QuoteDto;
import in.rks.academy.billing.BillingDtos.ReceiptDto;
import in.rks.academy.billing.BillingDtos.ReceiptLine;
import in.rks.academy.billing.BillingDtos.RecordPaymentRequest;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.IndianRupeeWords;
import in.rks.academy.common.PageResponse;
import in.rks.academy.common.Refs.PlanRef;
import in.rks.academy.common.Refs.PlayerRef;
import in.rks.academy.config.AppProperties;
import in.rks.academy.player.Player;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.CurrentUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final PaymentRepository payments;
    private final PlayerRepository players;
    private final AdminUserRepository users;
    private final BillingService billing;
    private final ReceiptNumberGenerator receipts;
    private final AppProperties props;
    private final Clock clock;

    public PaymentService(PaymentRepository payments, PlayerRepository players, AdminUserRepository users,
                          BillingService billing, ReceiptNumberGenerator receipts, AppProperties props,
                          Clock clock) {
        this.payments = payments;
        this.players = players;
        this.users = users;
        this.billing = billing;
        this.receipts = receipts;
        this.props = props;
        this.clock = clock;
    }

    public QuoteDto quote(long playerId, LocalDate paidOn) {
        Player player = activePlayer(playerId);
        LocalDate date = validPaidOn(player, paidOn);
        return toDto(player, billing.quote(player, date));
    }

    /** Records a payment. The server computes every amount; the client never sends totals. */
    @Transactional
    public PaymentDto record(RecordPaymentRequest req) {
        Player player = activePlayer(req.playerId());
        LocalDate paidOn = validPaidOn(player, req.paidOn());
        FeeQuote quote = billing.quote(player, paidOn);

        Payment p = new Payment();
        p.setReceiptNo(receipts.next(paidOn));
        p.setPlayer(player);
        p.setPlan(player.getFeePlan());
        p.setPlanAmount(quote.planAmount());
        p.setSiblingDiscount(quote.siblingDiscount());
        p.setLateFee(quote.lateFee());
        p.setRegistrationFee(quote.registrationFee());
        BigDecimal collected = req.amount() == null ? quote.total() : req.amount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal adjustment = collected.subtract(quote.total());
        String note = req.note() == null || req.note().isBlank() ? null : req.note().trim();
        if (adjustment.signum() != 0 && note == null) {
            throw ApiException.rule("ADJUSTMENT_NEEDS_REASON",
                    "The amount differs from the computed " + quote.total() + ". Add a reason.");
        }
        p.setAdjustment(adjustment);
        p.setAmount(collected);
        p.setMode(req.mode());
        p.setPaidOn(paidOn);
        p.setPeriodFrom(quote.period().from());
        p.setPeriodTo(quote.period().to());
        p.setNote(note);
        p.setRecordedBy(users.getReferenceById(CurrentUser.get().id()));
        return PaymentDto.of(payments.saveAndFlush(p));
    }

    /**
     * Voids a payment: it stays on record (and its receipt shows VOID) but no longer covers the period or counts
     * in totals, so the period can be recorded again correctly.
     */
    @Transactional
    public PaymentDto voidPayment(long id, String reason) {
        Payment p = payments.findWithPlayerById(id).orElseThrow(() -> ApiException.notFound("Payment", id));
        if (p.isVoided()) {
            throw ApiException.conflict("ALREADY_VOID", "Receipt " + p.getReceiptNo() + " is already void");
        }
        p.setVoidedAt(OffsetDateTime.now(clock));
        p.setVoidedBy(users.getReferenceById(CurrentUser.get().id()));
        p.setVoidReason(reason.trim());
        return PaymentDto.of(p);
    }

    public PageResponse<PaymentDto> list(LocalDate from, LocalDate to, Payment.Mode mode, Long playerId,
                                         boolean includeVoided, int page, int size) {
        Specification<Payment> spec = (root, q, cb) -> includeVoided ? cb.conjunction() : cb.isNull(root.get("voidedAt"));
        if (from != null) {
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("paidOn"), from));
        }
        if (to != null) {
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("paidOn"), to));
        }
        if (mode != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("mode"), mode));
        }
        if (playerId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("player").get("id"), playerId));
        }
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("paidOn"), Sort.Order.desc("createdAt")));
        return PageResponse.of(payments.findAll(spec, pageable), PaymentDto::of);
    }

    public List<PaymentDto> forPlayer(long playerId) {
        players.findById(playerId).orElseThrow(() -> ApiException.notFound("Player", playerId));
        return payments.findByPlayerIdOrderByPeriodFromDesc(playerId).stream().map(PaymentDto::of).toList();
    }

    public PaymentsSummary summary(YearMonth month) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        BigDecimal collected = payments.sumAmount(from, to);
        BigDecimal upi = payments.sumAmountByMode(from, to, Payment.Mode.UPI);
        int upiPct = collected.signum() == 0 ? 0
                : upi.multiply(BigDecimal.valueOf(100)).divide(collected, 0, RoundingMode.HALF_UP).intValue();
        List<BillingService.Due> dues = billing.dues();
        BigDecimal pending = dues.stream().map(d -> d.quote().total()).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PaymentsSummary(month.toString(), collected, payments.countLive(from, to), upi, upiPct,
                pending, dues.size());
    }

    public List<DueDto> dues() {
        return billing.dues().stream().map(PaymentService::toDue).toList();
    }

    public ReceiptDto receipt(String receiptNo) {
        Payment p = payments.findByReceiptNo(receiptNo)
                .orElseThrow(() -> ApiException.notFound("Receipt", receiptNo));
        List<ReceiptLine> lines = new ArrayList<>();
        String period = p.getPeriodFrom().format(MONTH)
                + (p.getPlan().getPeriodMonths() > 1 ? " – " + p.getPeriodTo().format(MONTH) : "");
        lines.add(new ReceiptLine(p.getPlan().getName() + " plan · " + period, p.getPlanAmount()));
        if (p.getSiblingDiscount().signum() > 0) {
            lines.add(new ReceiptLine("Sibling discount", p.getSiblingDiscount().negate()));
        }
        if (p.getRegistrationFee().signum() > 0) {
            lines.add(new ReceiptLine("Registration fee", p.getRegistrationFee()));
        }
        if (p.getLateFee().signum() > 0) {
            lines.add(new ReceiptLine("Late fee", p.getLateFee()));
        }
        if (p.getAdjustment().signum() != 0) {
            lines.add(new ReceiptLine("Adjustment", p.getAdjustment()));
        }
        Player pl = p.getPlayer();
        AppProperties.Academy academy = props.academy();
        return new ReceiptDto(p.getReceiptNo(), p.getPaidOn(), academy.name(), academy.address(), academy.phone(),
                pl.getCode(), pl.getName(), pl.getContactName(), pl.getBatch().getName(), p.getPlan().getName(),
                p.getPeriodFrom(), p.getPeriodTo(), lines, p.getAmount(), IndianRupeeWords.of(p.getAmount()),
                p.getMode(), p.getRecordedBy() == null ? null : p.getRecordedBy().getName(), p.getNote(),
                p.isVoided(), p.getVoidedAt(), p.getVoidReason());
    }

    static DueDto toDue(BillingService.Due d) {
        Player p = d.player();
        FeeQuote q = d.quote();
        return new DueDto(PlayerRef.of(p), p.getBatch().getName(), PlanRef.of(p.getFeePlan()), q.period().from(),
                q.period().to(), d.daysOverdue(), q.planAmount(), q.siblingDiscount(), q.lateFee(),
                q.registrationFee(), q.total());
    }

    private QuoteDto toDto(Player player, FeeQuote q) {
        return new QuoteDto(PlayerRef.of(player), PlanRef.of(player.getFeePlan()), q.period().from(),
                q.period().to(), q.planAmount(), q.siblingRank(), q.siblingDiscountPct(), q.siblingDiscount(),
                q.lateFee(), q.registrationFee(), q.total());
    }

    private Player activePlayer(long id) {
        Player player = players.findDetailed(id).orElseThrow(() -> ApiException.notFound("Player", id));
        if (!player.isActive()) {
            throw ApiException.rule("PLAYER_INACTIVE", player.getName() + " is no longer active");
        }
        return player;
    }

    private LocalDate validPaidOn(Player player, LocalDate paidOn) {
        LocalDate today = billing.today();
        LocalDate date = paidOn == null ? today : paidOn;
        if (date.isAfter(today)) {
            throw ApiException.rule("PAID_ON_FUTURE", "Payment date can't be in the future");
        }
        if (date.isBefore(player.getJoinDate())) {
            throw ApiException.rule("PAID_ON_BEFORE_JOIN", "Payment date is before the player joined");
        }
        return date;
    }
}
