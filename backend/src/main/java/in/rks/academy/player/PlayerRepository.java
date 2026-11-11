package in.rks.academy.player;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface PlayerRepository extends JpaRepository<Player, Long>, JpaSpecificationExecutor<Player> {

    @Override
    @EntityGraph(attributePaths = {"batch", "batch.court", "batch.coach", "feePlan"})
    Page<Player> findAll(Specification<Player> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"batch", "batch.court", "batch.coach", "feePlan"})
    @Query("select p from Player p where p.id = :id")
    java.util.Optional<Player> findDetailed(Long id);

    @EntityGraph(attributePaths = {"batch", "batch.court", "batch.coach", "feePlan"})
    List<Player> findByActiveTrue();

    @EntityGraph(attributePaths = {"batch", "feePlan"})
    List<Player> findByBatchIdAndActiveTrueAndJoinDateLessThanEqualOrderByNameAsc(Long batchId, LocalDate date);

    List<Player> findBySiblingGroupId(UUID siblingGroupId);

    long countByActiveTrue();

    boolean existsByParentMobileAndActiveTrue(String parentMobile);

    @EntityGraph(attributePaths = {"batch", "batch.court", "batch.coach", "feePlan"})
    List<Player> findByParentMobileAndActiveTrueOrderByJoinDateAsc(String parentMobile);

    long countByActiveTrueAndJoinDateGreaterThanEqual(LocalDate since);

    long countByBatchIdAndActiveTrue(Long batchId);

    long countByFeePlanIdAndActiveTrue(Long feePlanId);

    @Query(value = "select nextval('player_code_seq')", nativeQuery = true)
    long nextCodeNumber();
}
