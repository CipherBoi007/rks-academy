package in.rks.academy.family;

import in.rks.academy.admin.AdminUser;
import in.rks.academy.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** A family's report of a UPI payment to the academy, waiting for the owner to confirm or reject it. */
@Getter
@Setter
@Entity
@Table(name = "payment_report")
public class PaymentReport extends BaseEntity {

    public enum Status { PENDING, CONFIRMED, REJECTED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    /** The family-app account that reported it. */
    @JoinColumn(name = "family_account_id")
    private FamilyAccount account;

    /** The UPI reference (UTR), upper case without spaces. */
    @Column(nullable = false)
    private String utr;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private AdminUser reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "reject_reason")
    private String rejectReason;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<PaymentReportItem> items = new ArrayList<>();

    public void addItem(PaymentReportItem item) {
        item.setReport(this);
        items.add(item);
    }
}
