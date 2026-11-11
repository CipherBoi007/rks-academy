package in.rks.academy.notification;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeeReminderRepository extends JpaRepository<FeeReminder, Long> {

    Optional<FeeReminder> findByPlayerIdAndPeriodFrom(Long playerId, LocalDate periodFrom);

    @EntityGraph(attributePaths = "player")
    Page<FeeReminder> findByPeriodFromBetween(LocalDate from, LocalDate to, Pageable pageable);

    long countByPeriodFromBetweenAndStatus(LocalDate from, LocalDate to, FeeReminder.Status status);
}
