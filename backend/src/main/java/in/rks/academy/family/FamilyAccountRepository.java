package in.rks.academy.family;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface FamilyAccountRepository extends JpaRepository<FamilyAccount, Long> {

    Optional<FamilyAccount> findByMobile(String mobile);

    /** Serialises a parent's payment reports, so two sent at once can't claim the same fees. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from FamilyAccount a where a.id = :id")
    Optional<FamilyAccount> lockById(long id);
}
