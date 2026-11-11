package in.rks.academy.family;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginCodeRepository extends JpaRepository<LoginCode, Long> {

    Optional<LoginCode> findFirstByMobileOrderByCreatedAtDesc(String mobile);

    long countByMobileAndCreatedAtAfter(String mobile, OffsetDateTime since);
}
