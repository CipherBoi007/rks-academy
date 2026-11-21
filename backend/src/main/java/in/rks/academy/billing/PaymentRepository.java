package in.rks.academy.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {

    @Override
    @EntityGraph(attributePaths = {"player", "plan"})
    Page<Payment> findAll(Specification<Payment> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"player", "player.batch", "plan", "recordedBy", "voidedBy"})
    Optional<Payment> findByReceiptNo(String receiptNo);

    @EntityGraph(attributePaths = {"player", "plan"})
    Optional<Payment> findWithPlayerById(Long id);

    /** Any payment, voided or not: receipts must never lose their player. */
    boolean existsByPlayerId(Long playerId);

    /** A player's full history, voided payments included (the profile shows them struck through). */
    @EntityGraph(attributePaths = "plan")
    List<Payment> findByPlayerIdOrderByPeriodFromDesc(Long playerId);

    // Everything below counts live payments only: a voided payment covers nothing and earns nothing.

    @EntityGraph(attributePaths = "plan")
    @Query("select p from Payment p where p.player.id = :playerId and p.voidedAt is null order by p.periodFrom desc")
    List<Payment> findLiveByPlayer(Long playerId);

    /** Payments that can still cover a current period: anything that ends on or after the cutoff. */
    @Query("""
            select p from Payment p
            where p.player.id in :playerIds and p.periodTo >= :cutoff and p.voidedAt is null
            """)
    List<Payment> findCoveringCandidates(Collection<Long> playerIds, LocalDate cutoff);

    @Query("select distinct p.player.id from Payment p where p.player.id in :playerIds and p.voidedAt is null")
    List<Long> playerIdsWithPayments(Collection<Long> playerIds);

    @Query("select max(p.periodTo) from Payment p where p.player.id = :playerId and p.voidedAt is null")
    Optional<LocalDate> lastCoveredDate(Long playerId);

    @Query("""
            select coalesce(sum(p.amount), 0) from Payment p
            where p.paidOn between :from and :to and p.voidedAt is null
            """)
    BigDecimal sumAmount(LocalDate from, LocalDate to);

    @Query("""
            select coalesce(sum(p.amount), 0) from Payment p
            where p.paidOn between :from and :to and p.mode = :mode and p.voidedAt is null
            """)
    BigDecimal sumAmountByMode(LocalDate from, LocalDate to, Payment.Mode mode);

    @Query("select count(p) from Payment p where p.paidOn between :from and :to and p.voidedAt is null")
    long countLive(LocalDate from, LocalDate to);

    /** For CSV export: one query with everything the rows need, oldest first. */
    @EntityGraph(attributePaths = {"player", "plan", "recordedBy"})
    @Query("select p from Payment p where p.paidOn between :from and :to order by p.paidOn, p.receiptNo")
    List<Payment> findForExport(LocalDate from, LocalDate to);
}
