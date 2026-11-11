package in.rks.academy.attendance;

import in.rks.academy.admin.AdminUserRepository;
import in.rks.academy.batch.Batch;
import in.rks.academy.batch.BatchDto;
import in.rks.academy.batch.BatchRepository;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.Refs.PlayerRef;
import in.rks.academy.player.Player;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AttendanceService {

    public record Entry(PlayerRef player, AttendanceRecord.Status status) {
    }

    public record Sheet(LocalDate date, BatchDto batch, List<Entry> entries, long present, long absent,
                        long unmarked) {
    }

    public record Mark(@NotNull @Positive Long playerId, @NotNull AttendanceRecord.Status status) {
    }

    public record SaveRequest(@NotNull LocalDate date, @NotNull @Positive Long batchId,
                              @NotEmpty List<@Valid @NotNull Mark> entries) {
    }

    private final AttendanceRepository records;
    private final BatchRepository batches;
    private final PlayerRepository players;
    private final AdminUserRepository users;
    private final Clock clock;

    public AttendanceService(AttendanceRepository records, BatchRepository batches, PlayerRepository players,
                             AdminUserRepository users, Clock clock) {
        this.records = records;
        this.batches = batches;
        this.players = players;
        this.users = users;
        this.clock = clock;
    }

    /** The roster for a batch on a date: active players who had joined by then, with any saved status. */
    public Sheet sheet(LocalDate date, long batchId) {
        Batch batch = loadBatch(batchId);
        List<Player> roster = roster(batch, date);
        Map<Long, AttendanceRecord.Status> saved = records.findByBatchIdAndDate(batchId, date).stream()
                .collect(Collectors.toMap(r -> r.getPlayer().getId(), AttendanceRecord::getStatus));
        List<Entry> entries = roster.stream().map(p -> new Entry(PlayerRef.of(p), saved.get(p.getId()))).toList();
        long present = entries.stream().filter(e -> e.status() == AttendanceRecord.Status.PRESENT).count();
        long absent = entries.stream().filter(e -> e.status() == AttendanceRecord.Status.ABSENT).count();
        return new Sheet(date, BatchDto.of(batch, roster.size()), entries, present, absent,
                entries.size() - present - absent);
    }

    /** Upserts the given marks; players not in the request keep whatever was saved before. */
    @Transactional
    public Sheet save(SaveRequest req) {
        if (req.date().isAfter(LocalDate.now(clock))) {
            throw ApiException.rule("FUTURE_DATE", "Attendance can't be marked for a future date");
        }
        Batch batch = loadBatch(req.batchId());
        if (!batch.runsOn(req.date().getDayOfWeek())) {
            throw ApiException.rule("NO_SESSION", batch.getName() + " doesn't run on that day");
        }
        Map<Long, Player> roster = roster(batch, req.date()).stream()
                .collect(Collectors.toMap(Player::getId, Function.identity()));
        Set<Long> seen = new HashSet<>();
        for (Mark m : req.entries()) {
            if (!roster.containsKey(m.playerId())) {
                throw ApiException.rule("NOT_IN_BATCH", "Player " + m.playerId() + " isn't in " + batch.getName());
            }
            if (!seen.add(m.playerId())) {
                throw ApiException.badRequest("DUPLICATE_PLAYER", "Player " + m.playerId() + " is listed twice");
            }
        }
        Map<Long, AttendanceRecord> existing = records.findByBatchIdAndDate(batch.getId(), req.date()).stream()
                .collect(Collectors.toMap(r -> r.getPlayer().getId(), Function.identity()));
        var marker = users.getReferenceById(CurrentUser.get().id());
        for (Mark m : req.entries()) {
            AttendanceRecord r = existing.get(m.playerId());
            if (r == null) {
                r = new AttendanceRecord();
                r.setPlayer(roster.get(m.playerId()));
                r.setBatch(batch);
                r.setDate(req.date());
            }
            r.setStatus(m.status());
            r.setMarkedBy(marker);
            records.save(r);
        }
        records.flush();
        return sheet(req.date(), batch.getId());
    }

    private List<Player> roster(Batch batch, LocalDate date) {
        return players.findByBatchIdAndActiveTrueAndJoinDateLessThanEqualOrderByNameAsc(batch.getId(), date);
    }

    private Batch loadBatch(long id) {
        return batches.findById(id).filter(Batch::isActive).orElseThrow(() -> ApiException.notFound("Batch", id));
    }
}
