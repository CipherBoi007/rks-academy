package in.rks.academy.billing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface FeePlanRepository extends JpaRepository<FeePlan, Long> {

    List<FeePlan> findByActiveTrueOrderBySortOrderAscIdAsc();

    @Modifying(flushAutomatically = true)
    @Query("update FeePlan p set p.mostPopular = false where p.mostPopular = true and p.id <> :keepId")
    void clearMostPopularExcept(Long keepId);

    @Query("select coalesce(max(p.sortOrder), 0) from FeePlan p")
    int maxSortOrder();
}
