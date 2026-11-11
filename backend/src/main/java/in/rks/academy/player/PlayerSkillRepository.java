package in.rks.academy.player;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerSkillRepository extends JpaRepository<PlayerSkill, PlayerSkill.Key> {

    List<PlayerSkill> findByPlayerId(Long playerId);
}
