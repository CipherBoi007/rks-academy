package in.rks.academy.family;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParentAccountRepository extends JpaRepository<ParentAccount, Long> {

    Optional<ParentAccount> findByMobile(String mobile);
}
