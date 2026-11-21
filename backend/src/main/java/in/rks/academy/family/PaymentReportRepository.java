package in.rks.academy.family;

import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PaymentReportRepository extends JpaRepository<PaymentReport, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PaymentReport r where r.id = :id")
    Optional<PaymentReport> lockById(Long id);

    /** The owner's list: waiting reports first (oldest first), then decisions since {@code since}, newest first. */
    @EntityGraph(attributePaths = {"account", "reviewedBy", "items", "items.player"})
    @Query("""
            select distinct r from PaymentReport r
            where r.status = in.rks.academy.family.PaymentReport.Status.PENDING or r.reviewedAt >= :since
            """)
    List<PaymentReport> findForReview(OffsetDateTime since);

    /** An account's waiting reports plus the ones decided since {@code since}. */
    @EntityGraph(attributePaths = {"items", "items.player"})
    @Query("""
            select distinct r from PaymentReport r
            where r.account.id = :accountId and (r.status = in.rks.academy.family.PaymentReport.Status.PENDING or r.reviewedAt >= :since)
            """)
    List<PaymentReport> findRecentForAccount(long accountId, OffsetDateTime since);

    /** Players already covered by a waiting report, so a second report can't claim the same fees. */
    @Query("""
            select i.player.id from PaymentReportItem i
            where i.report.status = in.rks.academy.family.PaymentReport.Status.PENDING and i.player.id in :playerIds
            """)
    List<Long> playersInPendingReports(Collection<Long> playerIds);

    long countByStatus(PaymentReport.Status status);

    @Query("select count(i) > 0 from PaymentReportItem i where i.player.id = :playerId")
    boolean existsForPlayer(long playerId);

    boolean existsByAccountId(long accountId);

    boolean existsByUtrAndStatusNot(String utr, PaymentReport.Status status);
}
