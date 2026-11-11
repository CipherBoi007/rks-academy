package in.rks.academy.billing;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Immutable snapshot of one fee-policy version, used by the pure {@link FeeRules}. */
public record PolicyTerms(
        BigDecimal registrationFee,
        BigDecimal siblingDiscount2ndPct,
        BigDecimal siblingDiscount3rdPct,
        int lateFeeAfterDay,
        BigDecimal lateFeeBase,
        BigDecimal lateFeePerDay,
        BigDecimal lateFeeMax,
        LocalDate effectiveFrom) {
}
