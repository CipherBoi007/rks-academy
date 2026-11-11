package in.rks.academy.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import in.rks.academy.billing.FeeRules.SiblingRef;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class FeeRulesTest {

    static final PolicyTerms POLICY = new PolicyTerms(bd("1000"), bd("10"), bd("15"), 10, bd("100"), bd("10"),
            bd("300"), LocalDate.of(2000, 1, 1));

    static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }

    static LocalDate d(String s) {
        return LocalDate.parse(s);
    }

    @Nested
    class Periods {

        @ParameterizedTest(name = "monthly plan from {0}, on {1} -> {2}..{3}")
        @CsvSource({
                "2026-03-01, 2026-03-01, 2026-03-01, 2026-03-31",
                "2026-03-01, 2026-11-05, 2026-11-01, 2026-11-30",
                "2026-01-01, 2026-02-28, 2026-02-01, 2026-02-28",
                "2028-01-01, 2028-02-29, 2028-02-01, 2028-02-29"})
        void monthly(String start, String on, String from, String to) {
            assertThat(FeeRules.periodContaining(d(start), 1, d(on))).isEqualTo(new BillingPeriod(d(from), d(to)));
        }

        @ParameterizedTest(name = "quarterly plan from {0}, on {1} -> {2}..{3}")
        @CsvSource({
                "2026-02-01, 2026-11-05, 2026-11-01, 2027-01-31",
                "2026-04-01, 2026-11-05, 2026-10-01, 2026-12-31",
                "2026-11-01, 2027-01-31, 2026-11-01, 2027-01-31"})
        void quarterly(String start, String on, String from, String to) {
            assertThat(FeeRules.periodContaining(d(start), 3, d(on))).isEqualTo(new BillingPeriod(d(from), d(to)));
        }

        @Test
        void annualCrossesYearEnd() {
            assertThat(FeeRules.periodContaining(d("2025-06-01"), 12, d("2026-11-05")))
                    .isEqualTo(new BillingPeriod(d("2026-06-01"), d("2027-05-31")));
        }

        @Test
        void beforePlanStartGivesFirstPeriod() {
            assertThat(FeeRules.periodContaining(d("2027-01-01"), 3, d("2026-11-05")))
                    .isEqualTo(new BillingPeriod(d("2027-01-01"), d("2027-03-31")));
        }

        @Test
        void planStartMustBeFirstOfMonth() {
            assertThatThrownBy(() -> FeeRules.periodContaining(d("2026-03-09"), 1, d("2026-03-10")))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void nextPeriodFollowsOn() {
            BillingPeriod nov = new BillingPeriod(d("2026-11-01"), d("2026-11-30"));
            assertThat(FeeRules.nextPeriod(nov, 3)).isEqualTo(new BillingPeriod(d("2026-12-01"), d("2027-02-28")));
        }
    }

    @Nested
    class LateFee {

        final BillingPeriod nov = new BillingPeriod(d("2026-11-01"), d("2026-11-30"));

        @ParameterizedTest(name = "paid on {0} -> {1}")
        @CsvSource({
                "2026-11-01, 0.00",
                "2026-11-10, 0.00",   // the 10th itself is still on time
                "2026-11-11, 100.00", // base on the first late day
                "2026-11-12, 110.00", // then per day
                "2026-11-25, 240.00",
                "2026-12-01, 300.00", // 100 + 10 x 20 = 300, exactly the cap
                "2027-01-15, 300.00"})
        void afterTheTenth(String paidOn, String expected) {
            assertThat(FeeRules.lateFee(POLICY, nov, d(paidOn), false)).isEqualByComparingTo(expected);
        }

        @Test
        void joiningPeriodIsExempt() {
            assertThat(FeeRules.lateFee(POLICY, nov, d("2026-11-25"), true)).isEqualByComparingTo("0");
        }

        @Test
        void quarterlyCutoffIsInFirstMonthOfPeriod() {
            BillingPeriod q = new BillingPeriod(d("2026-10-01"), d("2026-12-31"));
            assertThat(FeeRules.lateFee(POLICY, q, d("2026-11-05"), false)).isEqualByComparingTo("300");
        }

        @Test
        void advancePaymentHasNoLateFee() {
            BillingPeriod dec = new BillingPeriod(d("2026-12-01"), d("2026-12-31"));
            assertThat(FeeRules.lateFee(POLICY, dec, d("2026-11-20"), false)).isEqualByComparingTo("0");
        }
    }

    @Nested
    class Siblings {

        final List<SiblingRef> group = List.of(
                new SiblingRef(3, d("2026-07-06"), true),
                new SiblingRef(1, d("2026-02-03"), true),
                new SiblingRef(4, d("2026-08-10"), true),
                new SiblingRef(5, d("2026-09-01"), true));

        @Test
        void rankedByJoinDate() {
            assertThat(FeeRules.siblingRank(group, 1)).isEqualTo(1);
            assertThat(FeeRules.siblingRank(group, 3)).isEqualTo(2);
            assertThat(FeeRules.siblingRank(group, 4)).isEqualTo(3);
            assertThat(FeeRules.siblingRank(group, 5)).isEqualTo(4);
        }

        @Test
        void inactiveSiblingsDontCount() {
            List<SiblingRef> withLeaver = List.of(new SiblingRef(1, d("2025-01-01"), false),
                    new SiblingRef(2, d("2026-01-01"), true));
            assertThat(FeeRules.siblingRank(withLeaver, 2)).isEqualTo(1);
        }

        @Test
        void sameJoinDateBreaksTieById() {
            List<SiblingRef> twins = List.of(new SiblingRef(9, d("2026-01-01"), true),
                    new SiblingRef(8, d("2026-01-01"), true));
            assertThat(FeeRules.siblingRank(twins, 8)).isEqualTo(1);
            assertThat(FeeRules.siblingRank(twins, 9)).isEqualTo(2);
        }

        @Test
        void discountByRank() {
            assertThat(FeeRules.siblingDiscountPct(POLICY, 1)).isEqualByComparingTo("0");
            assertThat(FeeRules.siblingDiscountPct(POLICY, 2)).isEqualByComparingTo("10");
            assertThat(FeeRules.siblingDiscountPct(POLICY, 3)).isEqualByComparingTo("15");
            assertThat(FeeRules.siblingDiscountPct(POLICY, 4)).isEqualByComparingTo("15");
        }
    }

    @Nested
    class Quote {

        final BillingPeriod nov = new BillingPeriod(d("2026-11-01"), d("2026-11-30"));

        @Test
        void newJoinerPaysFullMonthPlusRegistrationWithoutLateFee() {
            FeeQuote q = FeeRules.quote(bd("1500"), nov, d("2026-11-20"), d("2026-11-25"), true, 1, POLICY);
            assertThat(q.planAmount()).isEqualByComparingTo("1500");
            assertThat(q.registrationFee()).isEqualByComparingTo("1000");
            assertThat(q.lateFee()).isEqualByComparingTo("0");
            assertThat(q.total()).isEqualByComparingTo("2500");
        }

        @Test
        void secondSiblingLatePayment() {
            FeeQuote q = FeeRules.quote(bd("4200"), nov, d("2026-02-01"), d("2026-11-13"), false, 2, POLICY);
            assertThat(q.siblingDiscount()).isEqualByComparingTo("420");
            assertThat(q.lateFee()).isEqualByComparingTo("120");
            assertThat(q.total()).isEqualByComparingTo("3900"); // 4200 - 420 + 120
        }

        @Test
        void discountRoundsToWholeRupees() {
            FeeQuote q = FeeRules.quote(bd("1499"), nov, d("2026-01-01"), d("2026-11-02"), false, 3, POLICY);
            assertThat(q.siblingDiscount()).isEqualByComparingTo("225"); // 224.85 -> 225
            assertThat(q.total()).isEqualByComparingTo("1274");
        }
    }

    @Nested
    class PolicyVersions {

        final PolicyTerms v1 = POLICY;
        final PolicyTerms v2 = new PolicyTerms(bd("1200"), bd("10"), bd("15"), 10, bd("150"), bd("10"), bd("400"),
                d("2026-12-01"));

        @Test
        void changeAppliesFromNextCycleOnly() {
            List<PolicyTerms> versions = List.of(v2, v1);
            assertThat(FeeRules.policyOn(versions, d("2026-11-01"))).isEqualTo(v1);
            assertThat(FeeRules.policyOn(versions, d("2026-11-30"))).isEqualTo(v1);
            assertThat(FeeRules.policyOn(versions, d("2026-12-01"))).isEqualTo(v2);
        }

        @Test
        void novemberDueStillUsesOldLateFeeAfterChange() {
            BillingPeriod nov = new BillingPeriod(d("2026-11-01"), d("2026-11-30"));
            PolicyTerms inForce = FeeRules.policyOn(List.of(v1, v2), nov.from());
            assertThat(FeeRules.lateFee(inForce, nov, d("2026-12-15"), false)).isEqualByComparingTo("300");
        }
    }

    @Test
    void daysOverdueCountsFromLaterOfPeriodStartAndJoin() {
        BillingPeriod nov = new BillingPeriod(d("2026-11-01"), d("2026-11-30"));
        assertThat(FeeRules.daysOverdue(nov, d("2026-03-09"), d("2026-11-05"))).isEqualTo(4);
        assertThat(FeeRules.daysOverdue(nov, d("2026-11-03"), d("2026-11-05"))).isEqualTo(2);
    }
}
