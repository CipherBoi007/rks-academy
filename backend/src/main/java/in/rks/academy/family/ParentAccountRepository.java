package in.rks.academy.family;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ParentAccountRepository extends JpaRepository<ParentAccount, Long> {

    Optional<ParentAccount> findByMobile(String mobile);

    /** Serialises a parent's payment reports, so two sent at once can't claim the same fees. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from ParentAccount a where a.id = :id")
    Optional<ParentAccount> lockById(long id);
}
