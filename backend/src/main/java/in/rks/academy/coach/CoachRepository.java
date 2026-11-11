package in.rks.academy.coach;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoachRepository extends JpaRepository<Coach, Long> {

    List<Coach> findAllByOrderByActiveDescNameAsc();

    List<Coach> findByActiveTrueOrderByNameAsc();
}
