package in.rks.academy.admin;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {

    @EntityGraph(attributePaths = "coach")
    Optional<AdminUser> findByMobile(String mobile);

    boolean existsByRole(AdminUser.Role role);

    boolean existsByMobile(String mobile);

    @EntityGraph(attributePaths = "coach")
    Optional<AdminUser> findWithCoachById(Long id);

    @EntityGraph(attributePaths = "coach")
    List<AdminUser> findAllByOrderByActiveDescRoleAscNameAsc();

    long countByRoleAndActiveTrue(AdminUser.Role role);
}
