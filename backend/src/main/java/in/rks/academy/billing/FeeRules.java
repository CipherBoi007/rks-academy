package in.rks.academy.billing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/**
 * The academy's billing rules, kept free of persistence so they can be unit-tested directly.
 *
 * <ul>
 *   <li>Billing is by calendar month. Every period starts on the 1st, and periods repeat every
 *       {@code periodMonths} from the plan start (the 1st of the joining month).</li>
 *   <li>The late fee starts after day {@code lateFeeAfterDay} of the period's first month: the base amount on
 *       the next day, then the per-day amount for each further day, capped at the maximum. The joining period
 *       is exempt.</li>
 *   <li>Siblings are ranked by join date. The 2nd gets the 2nd-child discount; the 3rd and later get the
 *       3rd-child discount.</li>
 *   <li>The registration fee is charged on a player's first ever payment.</li>
 *   <li>The policy version that applies is the one in force on the period's start date, so a change only
 *       affects later billing cycles.</li>
 * </ul>
 */
public final class FeeRules {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private FeeRules() {
    }

    public record SiblingRef(long playerId, LocalDate joinDate, boolean active) {
    }

    public static LocalDate firstOfMonth(LocalDate date) {
        return date.withDayOfMonth(1);
    }

    /** The period of a plan that started on {@code planStart} which contains {@code date}. */
    public static BillingPeriod periodContaining(LocalDate planStart, int periodMonths, LocalDate date) {
        if (planStart.getDayOfMonth() != 1) {
            throw new IllegalArgumentException("Plan start must be the 1st of a month: " + planStart);
        }
        if (periodMonths < 1) {
            throw new IllegalArgumentException("periodMonths must be positive");
        }
        if (date.isBefore(planStart)) {
            return firstPeriod(planStart, periodMonths);
        }
        long monthsSinceStart = ChronoUnit.MONTHS.between(YearMonth.from(planStart), YearMonth.from(date));
        LocalDate from = planStart.plusMonths(monthsSinceStart / periodMonths * periodMonths);
        return new BillingPeriod(from, from.plusMonths(periodMonths).minusDays(1));
    }

    public static BillingPeriod firstPeriod(LocalDate planStart, int periodMonths) {
        return new BillingPeriod(planStart, planStart.plusMonths(periodMonths).minusDays(1));
    }

    public static BillingPeriod nextPeriod(BillingPeriod period, int periodMonths) {
        LocalDate from = period.to().plusDays(1);
        return new BillingPeriod(from, from.plusMonths(periodMonths).minusDays(1));
    }

    /** Picks the policy version in force on {@code date} from versions in any order. */
    public static PolicyTerms policyOn(List<PolicyTerms> versions, LocalDate date) {
        return versions.stream()
                .filter(v -> !v.effectiveFrom().isAfter(date))
                .max(Comparator.comparing(PolicyTerms::effectiveFrom))
                .orElseThrow(() -> new IllegalStateException("No fee policy in force on " + date));
    }

    public static BigDecimal lateFee(PolicyTerms policy, BillingPeriod period, LocalDate asOf, boolean joiningPeriod) {
        if (joiningPeriod) {
            return money(BigDecimal.ZERO);
        }
        LocalDate cutoff = period.from().withDayOfMonth(
                Math.min(policy.lateFeeAfterDay(), period.from().lengthOfMonth()));
        long daysLate = ChronoUnit.DAYS.between(cutoff, asOf);
        if (daysLate <= 0) {
            return money(BigDecimal.ZERO);
        }
        BigDecimal fee = policy.lateFeeBase().add(policy.lateFeePerDay().multiply(BigDecimal.valueOf(daysLate - 1)));
        return money(fee.min(policy.lateFeeMax()));
    }

    /** 1-based position of the player among their active siblings, ordered by join date then id. */
    public static int siblingRank(List<SiblingRef> group, long playerId) {
        List<SiblingRef> ordered = group.stream()
                .filter(s -> s.active() || s.playerId() == playerId)
                .sorted(Comparator.comparing(SiblingRef::joinDate).thenComparing(SiblingRef::playerId))
                .toList();
        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).playerId() == playerId) {
                return i + 1;
            }
        }
        return 1;
    }

    public static BigDecimal siblingDiscountPct(PolicyTerms policy, int rank) {
        if (rank <= 1) {
            return BigDecimal.ZERO;
        }
        return rank == 2 ? policy.siblingDiscount2ndPct() : policy.siblingDiscount3rdPct();
    }

    /** Days a due has been outstanding, counted from the later of the period start and the join date. */
    public static long daysOverdue(BillingPeriod period, LocalDate joinDate, LocalDate today) {
        LocalDate start = joinDate.isAfter(period.from()) ? joinDate : period.from();
        return Math.max(0, ChronoUnit.DAYS.between(start, today));
    }

    public static FeeQuote quote(BigDecimal planPrice, BillingPeriod period, LocalDate joinDate, LocalDate asOf,
                                 boolean firstEverPayment, int siblingRank, PolicyTerms policy) {
        BigDecimal pct = siblingDiscountPct(policy, siblingRank);
        // Discounts are rounded to whole rupees, which is how the front desk quotes them.
        BigDecimal discount = planPrice.multiply(pct).divide(HUNDRED, 0, RoundingMode.HALF_UP);
        BigDecimal late = lateFee(policy, period, asOf, period.contains(joinDate));
        BigDecimal registration = firstEverPayment ? policy.registrationFee() : BigDecimal.ZERO;
        BigDecimal total = planPrice.subtract(discount).add(late).add(registration);
        return new FeeQuote(period, money(planPrice), siblingRank, pct, money(discount), late, money(registration),
                money(total));
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
