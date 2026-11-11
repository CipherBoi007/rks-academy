package in.rks.academy.court;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CourtRepository extends JpaRepository<Court, Long> {

    List<Court> findAllByOrderBySortOrderAsc();

    List<Court> findByActiveTrueOrderBySortOrderAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query("select coalesce(max(c.sortOrder), 0) from Court c")
    int maxSortOrder();
}
