package in.rks.academy.billing;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeePolicyRepository extends JpaRepository<FeePolicy, Long> {

    List<FeePolicy> findAllByOrderByEffectiveFromAsc();

    Optional<FeePolicy> findByEffectiveFrom(LocalDate effectiveFrom);
}
