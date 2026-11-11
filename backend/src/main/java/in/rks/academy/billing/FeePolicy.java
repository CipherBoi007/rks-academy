package in.rks.academy.billing;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** One version of the fee policy; the version in force for a period is the latest with effectiveFrom <= period start. */
@Getter
@Setter
@Entity
@Table(name = "fee_policy")
public class FeePolicy extends BaseEntity {

    @Column(name = "registration_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal registrationFee;

    @Column(name = "sibling_discount_2nd_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal siblingDiscount2ndPct;

    @Column(name = "sibling_discount_3rd_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal siblingDiscount3rdPct;

    @Column(name = "late_fee_after_day", nullable = false)
    private int lateFeeAfterDay;

    @Column(name = "late_fee_base", nullable = false, precision = 10, scale = 2)
    private BigDecimal lateFeeBase;

    @Column(name = "late_fee_per_day", nullable = false, precision = 10, scale = 2)
    private BigDecimal lateFeePerDay;

    @Column(name = "late_fee_max", nullable = false, precision = 10, scale = 2)
    private BigDecimal lateFeeMax;

    @Column(name = "effective_from", nullable = false, unique = true)
    private LocalDate effectiveFrom;

    public PolicyTerms terms() {
        return new PolicyTerms(registrationFee, siblingDiscount2ndPct, siblingDiscount3rdPct, lateFeeAfterDay,
                lateFeeBase, lateFeePerDay, lateFeeMax, effectiveFrom);
    }
}
