package in.rks.academy.family;

import in.rks.academy.billing.Payment;
import in.rks.academy.common.BaseEntity;
import in.rks.academy.player.Player;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** One child's share of a payment report; {@code payment} is set when the owner confirms it. */
@Getter
@Setter
@Entity
@Table(name = "payment_report_item")
public class PaymentReportItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id")
    private PaymentReport report;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id")
    private Player player;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;
}
