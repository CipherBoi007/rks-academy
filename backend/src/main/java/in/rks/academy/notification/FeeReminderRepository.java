package in.rks.academy.notification;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FeeReminderRepository extends JpaRepository<FeeReminder, Long> {

    Optional<FeeReminder> findByPlayerIdAndPeriodFrom(Long playerId, LocalDate periodFrom);

    @EntityGraph(attributePaths = "player")
    Page<FeeReminder> findByPeriodFromBetween(LocalDate from, LocalDate to, Pageable pageable);

    long countByPeriodFromBetweenAndStatus(LocalDate from, LocalDate to, FeeReminder.Status status);

    // "Delivered" means Meta accepted it. The log provider only records a reminder, so it reached nobody.

    @Query("""
            select count(r) from FeeReminder r
            where r.periodFrom between :from and :to
              and r.status = in.rks.academy.notification.FeeReminder.Status.SENT and r.provider <> 'log'
            """)
    long countDelivered(LocalDate from, LocalDate to);

}
