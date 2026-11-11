package in.rks.academy.batch;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    @EntityGraph(attributePaths = {"court", "coach"})
    @Query("select b from Batch b where b.active = true order by b.court.sortOrder, b.startTime")
    List<Batch> findAllActive();

    @EntityGraph(attributePaths = {"court", "coach"})
    @Query("select b from Batch b order by b.active desc, b.court.sortOrder, b.startTime")
    List<Batch> findAllForAdmin();

    @EntityGraph(attributePaths = {"court", "coach"})
    List<Batch> findByCourtIdAndActiveTrue(Long courtId);

    long countByCourtIdAndActiveTrue(Long courtId);

    long countByCoachIdAndActiveTrue(Long coachId);
}
