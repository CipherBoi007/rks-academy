package in.rks.academy.billing;

import java.math.BigDecimal;

/** The money breakdown for one billing period. total = planAmount - siblingDiscount + lateFee + registrationFee. */
public record FeeQuote(
        BillingPeriod period,
        BigDecimal planAmount,
        int siblingRank,
        BigDecimal siblingDiscountPct,
        BigDecimal siblingDiscount,
        BigDecimal lateFee,
        BigDecimal registrationFee,
        BigDecimal total) {
}
