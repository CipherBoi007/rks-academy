package in.rks.academy.family;

import in.rks.academy.billing.BillingDtos.PaymentDto;
import in.rks.academy.billing.BillingDtos.QuoteDto;
import in.rks.academy.billing.BillingDtos.ReceiptDto;
import in.rks.academy.billing.BillingService;
import in.rks.academy.billing.FeeRules;
import in.rks.academy.billing.PaymentService;
import in.rks.academy.billing.PolicyService;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.Names;
import in.rks.academy.player.Level;
import in.rks.academy.player.Player;
import in.rks.academy.player.PlayerDtos.FeeStatus;
import in.rks.academy.player.PlayerDtos.PlayerAttendance;
import in.rks.academy.player.PlayerDtos.PlayerDetail;
import in.rks.academy.player.PlayerDtos.ProgressDto;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.player.PlayerService;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Everything a parent can see: only their own children (active players with their mobile number), read-only.
 * A child who isn't theirs is reported as not found, so the portal never confirms that an ID exists.
 */
@Service
@Transactional(readOnly = true)
public class FamilyService {

    public record DueInfo(BigDecimal amount, LocalDate periodFrom, LocalDate periodTo, LocalDate payBy) {
    }

    public record ChildCard(long id, String code, String name, String initials, String photoUrl, int age, Level level,
                            String batchName, LocalTime startTime, LocalTime endTime, List<DayOfWeek> days,
                            String courtName, String coachName, FeeStatus feeStatus, DueInfo due, int attendancePct) {
    }

    public record Family(String mobile, String parentName, List<ChildCard> children) {
    }

    private final PlayerRepository players;
    private final PlayerService playerService;
    private final PaymentService payments;
    private final BillingService billing;
    private final PolicyService policies;

    public FamilyService(PlayerRepository players, PlayerService playerService, PaymentService payments,
                         BillingService billing, PolicyService policies) {
        this.players = players;
        this.playerService = playerService;
        this.payments = payments;
        this.billing = billing;
        this.policies = policies;
    }

    /** The signed-in parent. Endpoints under /api/v1/family/** only run for family tokens. */
    public static FamilyPrincipal current() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof FamilyPrincipal principal)) {
            throw ApiException.notFound("Family", "session");
        }
        return principal;
    }

    public Family family() {
        String mobile = current().mobile();
        List<Player> children = players.findByParentMobileAndActiveTrueOrderByJoinDateAsc(mobile);
        Map<Long, BillingService.FeeState> states = billing.feeStates(children);
        List<ChildCard> cards = children.stream().map(p -> card(p, states.get(p.getId()))).toList();
        String parentName = children.isEmpty() ? null : children.get(0).getParentName();
        return new Family(mobile, parentName, cards);
    }

    public PlayerDetail child(long id) {
        return playerService.get(own(id).getId());
    }

    public PlayerAttendance attendance(long id, YearMonth month) {
        return playerService.attendanceMonth(own(id).getId(), month);
    }

    public ProgressDto progress(long id) {
        return playerService.progress(own(id).getId());
    }

    public List<PaymentDto> payments(long id) {
        return payments.forPlayer(own(id).getId());
    }

    /** What is due now for this child, or null when nothing is. */
    public QuoteDto due(long id) {
        Player p = own(id);
        BillingService.FeeState state = billing.feeStates(List.of(p)).get(p.getId());
        return state != null && state.due() ? payments.quote(p.getId(), null) : null;
    }

    public ReceiptDto receipt(String receiptNo) {
        ReceiptDto receipt = payments.receipt(receiptNo);
        boolean ours = players.findByParentMobileAndActiveTrueOrderByJoinDateAsc(current().mobile()).stream()
                .anyMatch(p -> p.getCode().equals(receipt.playerCode()));
        if (!ours) {
            throw ApiException.notFound("Receipt", receiptNo);
        }
        return receipt;
    }

    /** The last day to pay a period's fee without a late fee. */
    LocalDate payBy(LocalDate periodFrom) {
        return periodFrom.withDayOfMonth(FeeRules.policyOn(policies.allTerms(), periodFrom).lateFeeAfterDay());
    }

    private Player own(long id) {
        String mobile = current().mobile();
        return players.findDetailed(id)
                .filter(p -> p.isActive() && p.getParentMobile().equals(mobile))
                .orElseThrow(() -> ApiException.notFound("Player", id));
    }

    private ChildCard card(Player p, BillingService.FeeState state) {
        boolean isDue = state != null && state.due();
        DueInfo due = null;
        if (isDue) {
            QuoteDto q = payments.quote(p.getId(), null);
            due = new DueInfo(q.total(), q.periodFrom(), q.periodTo(), payBy(q.periodFrom()));
        }
        var b = p.getBatch();
        return new ChildCard(p.getId(), p.getCode(), p.getName(), Names.initials(p.getName()), p.getPhotoUrl(),
                p.ageOn(billing.today()), p.getLevel(), b.getName(), b.getStartTime(), b.getEndTime(),
                List.copyOf(b.days()), b.getCourt().getName(), b.getCoach().getName(),
                isDue ? FeeStatus.DUE : FeeStatus.PAID, due, playerService.attendance(p.getId(), null, null).pct());
    }
}
