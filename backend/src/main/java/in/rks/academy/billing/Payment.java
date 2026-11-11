package in.rks.academy.billing;

import in.rks.academy.admin.AdminUser;
import in.rks.academy.common.BaseEntity;
import in.rks.academy.player.Player;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "payment")
public class Payment extends BaseEntity {

    public enum Mode { UPI, CASH }

    @Column(name = "receipt_no", nullable = false, unique = true, updatable = false)
    private String receiptNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id")
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fee_plan_id")
    private FeePlan plan;

    @Column(name = "plan_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal planAmount;

    @Column(name = "sibling_discount", nullable = false, precision = 10, scale = 2)
    private BigDecimal siblingDiscount;

    @Column(name = "late_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal lateFee;

    @Column(name = "registration_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal registrationFee;

    /** Amount collected minus the computed total, when the desk overrides it; a note explains why. */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal adjustment = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Mode mode;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by")
    private AdminUser recordedBy;

    @Column(name = "voided_at")
    private OffsetDateTime voidedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voided_by")
    private AdminUser voidedBy;

    @Column(name = "void_reason")
    private String voidReason;

    public boolean isVoided() {
        return voidedAt != null;
    }

    public boolean covers(LocalDate date) {
        return !date.isBefore(periodFrom) && !date.isAfter(periodTo);
    }
}
