package in.rks.academy.billing;

import in.rks.academy.common.ApiException;
import in.rks.academy.player.Player;
import in.rks.academy.player.PlayerRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies {@link FeeRules} to stored players and payments: fee status, dues and payment quotes. */
@Service
@Transactional(readOnly = true)
public class BillingService {

    /** How far ahead a payment may be made. Beyond this the player is simply paid up. */
    private static final int MAX_ADVANCE_PERIODS = 12;

    public record FeeState(BillingPeriod currentPeriod, boolean due) {
    }

    public record Due(Player player, FeeQuote quote, long daysOverdue) {
    }

    private final PlayerRepository players;
    private final PaymentRepository payments;
    private final PolicyService policies;
    private final Clock clock;

    public BillingService(PlayerRepository players, PaymentRepository payments, PolicyService policies,
                          Clock clock) {
        this.players = players;
        this.payments = payments;
        this.policies = policies;
        this.clock = clock;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    /** PAID/DUE for each player, judged on whether a payment covers the start of the current period. */
    public Map<Long, FeeState> feeStates(Collection<Player> list) {
        LocalDate today = today();
        Map<Long, List<Payment>> byPlayer = coveringCandidates(list, today);
        return list.stream().collect(Collectors.toMap(Player::getId, p -> {
            if (p.getPlanStartDate().isAfter(today)) {
                return new FeeState(null, false); // already paid up to the start of a newly switched plan
            }
            BillingPeriod period = FeeRules.periodContaining(p.getPlanStartDate(), p.getFeePlan().getPeriodMonths(),
                    today);
            boolean covered = byPlayer.getOrDefault(p.getId(), List.of()).stream()
                    .anyMatch(pay -> pay.covers(period.from()));
            return new FeeState(period, !covered);
        }));
    }

    /** Every active player with an uncovered current period, longest overdue first. */
    public List<Due> dues() {
        LocalDate today = today();
        List<Player> active = players.findByActiveTrue();
        Map<Long, FeeState> states = feeStates(active);
        Set<Long> hasPaidBefore = new HashSet<>(payments.playerIdsWithPayments(
                active.stream().map(Player::getId).toList()));
        Map<UUID, List<FeeRules.SiblingRef>> siblings = siblingGroups(active);
        List<PolicyTerms> terms = policies.allTerms();
        return active.stream()
                .filter(p -> states.get(p.getId()).due())
                .map(p -> {
                    BillingPeriod period = states.get(p.getId()).currentPeriod();
                    FeeQuote quote = FeeRules.quote(p.getFeePlan().getPrice(), period, p.getJoinDate(), today,
                            !hasPaidBefore.contains(p.getId()), rank(p, siblings),
                            FeeRules.policyOn(terms, period.from()));
                    return new Due(p, quote, FeeRules.daysOverdue(period, p.getJoinDate(), today));
                })
                .sorted(Comparator.comparingLong(Due::daysOverdue).reversed()
                        .thenComparing(d -> d.quote().total(), Comparator.reverseOrder())
                        .thenComparing(d -> d.player().getName()))
                .toList();
    }

    /**
     * Quotes the payment a player would make on {@code paidOn}: the period containing that date, or the next
     * uncovered one when it is already paid. Arrears from earlier periods are not collected here.
     */
    public FeeQuote quote(Player player, LocalDate paidOn) {
        List<Payment> history = payments.findLiveByPlayer(player.getId());
        BillingPeriod period = nextUncoveredPeriod(player, paidOn, history);
        Map<UUID, List<FeeRules.SiblingRef>> siblings = player.getSiblingGroupId() == null
                ? Map.of()
                : siblingGroups(players.findBySiblingGroupId(player.getSiblingGroupId()));
        PolicyTerms policy = FeeRules.policyOn(policies.allTerms(), period.from());
        return FeeRules.quote(player.getFeePlan().getPrice(), period, player.getJoinDate(), paidOn,
                history.isEmpty(), rank(player, siblings), policy);
    }

    /** Where a new plan's periods should start: the 1st of the first month not yet paid for. */
    public LocalDate planStartForChange(Player player) {
        LocalDate thisMonth = FeeRules.firstOfMonth(today());
        return payments.lastCoveredDate(player.getId())
                .map(last -> last.plusDays(1))
                .filter(next -> next.isAfter(thisMonth))
                .map(FeeRules::firstOfMonth)
                .orElse(thisMonth);
    }

    BillingPeriod nextUncoveredPeriod(Player player, LocalDate onDate, List<Payment> history) {
        int months = player.getFeePlan().getPeriodMonths();
        LocalDate anchor = onDate.isBefore(player.getPlanStartDate()) ? player.getPlanStartDate() : onDate;
        BillingPeriod period = FeeRules.periodContaining(player.getPlanStartDate(), months, anchor);
        for (int i = 0; i < MAX_ADVANCE_PERIODS; i++) {
            LocalDate start = period.from();
            if (history.stream().noneMatch(p -> p.covers(start))) {
                return period;
            }
            period = FeeRules.nextPeriod(period, months);
        }
        throw ApiException.conflict("ALREADY_PAID", player.getName() + " is already paid up to " + period.from());
    }

    private Map<Long, List<Payment>> coveringCandidates(Collection<Player> list, LocalDate today) {
        if (list.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = list.stream().map(Player::getId).toList();
        return payments.findCoveringCandidates(ids, today.minusYears(1)).stream()
                .collect(Collectors.groupingBy(p -> p.getPlayer().getId()));
    }

    private static Map<UUID, List<FeeRules.SiblingRef>> siblingGroups(Collection<Player> list) {
        return list.stream()
                .filter(p -> p.getSiblingGroupId() != null)
                .collect(Collectors.groupingBy(Player::getSiblingGroupId, Collectors.mapping(
                        p -> new FeeRules.SiblingRef(p.getId(), p.getJoinDate(), p.isActive()),
                        Collectors.toList())));
    }

    private static int rank(Player p, Map<UUID, List<FeeRules.SiblingRef>> groups) {
        if (p.getSiblingGroupId() == null) {
            return 1;
        }
        return FeeRules.siblingRank(groups.getOrDefault(p.getSiblingGroupId(), List.of()), p.getId());
    }
}
