package in.rks.academy.player;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerLevelHistoryRepository extends JpaRepository<PlayerLevelHistory, Long> {

    List<PlayerLevelHistory> findByPlayerIdOrderByAchievedOnAsc(Long playerId);

    boolean existsByPlayerIdAndLevel(Long playerId, Level level);
}
