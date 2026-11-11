package in.rks.academy.attendance;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByBatchIdAndDate(Long batchId, LocalDate date);

    List<AttendanceRecord> findByPlayerIdAndDateBetweenOrderByDateAsc(Long playerId, LocalDate from, LocalDate to);

    long countByDate(LocalDate date);

    long countByDateAndStatus(LocalDate date, AttendanceRecord.Status status);

    @EntityGraph(attributePaths = {"player", "batch", "batch.court"})
    @Query("select a from AttendanceRecord a where a.date between :from and :to order by a.date, a.batch.id, a.player.code")
    List<AttendanceRecord> findForExport(LocalDate from, LocalDate to);

    @Query("select distinct a.batch.id from AttendanceRecord a where a.date = :date")
    List<Long> batchIdsMarkedOn(LocalDate date);
}
