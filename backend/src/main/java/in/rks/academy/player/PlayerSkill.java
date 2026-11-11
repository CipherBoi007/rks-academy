package in.rks.academy.player;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "player_skill")
@IdClass(PlayerSkill.Key.class)
public class PlayerSkill {

    public enum Skill { FOOTWORK, SMASH, DEFENCE, NET_PLAY, STAMINA }

    public record Key(Long playerId, Skill skill) implements Serializable {
        public Key() {
            this(null, null);
        }
    }

    @Id
    @Column(name = "player_id")
    private Long playerId;

    @Id
    @Enumerated(EnumType.STRING)
    private Skill skill;

    @Column(nullable = false)
    private int score;

    @Column(name = "updated_on", nullable = false)
    private LocalDate updatedOn;

    public PlayerSkill(Long playerId, Skill skill, int score, LocalDate updatedOn) {
        this.playerId = playerId;
        this.skill = skill;
        this.score = score;
        this.updatedOn = updatedOn;
    }
}
