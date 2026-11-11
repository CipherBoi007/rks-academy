package in.rks.academy.notification;

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
@Table(name = "fee_reminder")
public class FeeReminder extends BaseEntity {

    public enum Status { SENT, FAILED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id")
    private Player player;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "to_mobile", nullable = false)
    private String toMobile;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(nullable = false)
    private String provider;

    @Column(name = "provider_message_id")
    private String providerMessageId;

    private String error;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;
}
