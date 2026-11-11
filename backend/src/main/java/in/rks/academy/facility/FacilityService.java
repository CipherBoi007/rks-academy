package in.rks.academy.facility;

import in.rks.academy.batch.Batch;
import in.rks.academy.batch.BatchDto;
import in.rks.academy.batch.BatchRepository;
import in.rks.academy.coach.Coach;
import in.rks.academy.coach.CoachRepository;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.Names;
import in.rks.academy.court.Court;
import in.rks.academy.court.CourtRepository;
import in.rks.academy.player.Level;
import in.rks.academy.player.PlayerRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Courts, coaches and batches. Nothing is deleted. Items are turned off instead, and only once nothing active
 * depends on them, so attendance and payment history always resolve.
 */
@Service
@Transactional(readOnly = true)
public class FacilityService {

    public record CourtDto(long id, String name, String surfaceType, boolean active, long activeBatches) {
    }

    public record CourtRequest(@NotBlank @Size(max = 60) String name, @NotBlank @Size(max = 60) String surfaceType,
                               boolean active) {
    }

    public record CoachDto(long id, String name, String title, String mobile, String initials, boolean active,
                           long activeBatches) {
    }

    public record CoachRequest(@NotBlank @Size(max = 100) String name, @Size(max = 40) String title,
                               @Pattern(regexp = "\\d{10}", message = "Enter a 10-digit mobile number") String mobile,
                               boolean active) {
    }

    public record BatchRequest(@NotBlank @Size(max = 80) String name, @NotNull @Positive Long courtId,
                               @NotNull @Positive Long coachId, @NotNull LocalTime startTime,
                               @NotNull LocalTime endTime, @NotEmpty Set<DayOfWeek> days, Level level,
                               boolean active) {
    }

    private final CourtRepository courts;
    private final CoachRepository coaches;
    private final BatchRepository batches;
    private final PlayerRepository players;

    public FacilityService(CourtRepository courts, CoachRepository coaches, BatchRepository batches,
                           PlayerRepository players) {
        this.courts = courts;
        this.coaches = coaches;
        this.batches = batches;
        this.players = players;
    }

    // ---- Courts -----------------------------------------------------------------------------------------------

    public List<CourtDto> courts(boolean includeInactive) {
        List<Court> list = includeInactive ? courts.findAllByOrderBySortOrderAsc()
                : courts.findByActiveTrueOrderBySortOrderAsc();
        return list.stream().map(this::toDto).toList();
    }

    @Transactional
    public CourtDto createCourt(CourtRequest req) {
        if (courts.existsByNameIgnoreCase(req.name().trim())) {
            throw ApiException.conflict("COURT_EXISTS", "A court with this name already exists");
        }
        Court c = new Court();
        c.setSortOrder(courts.maxSortOrder() + 1);
        applyCourt(c, req);
        return toDto(courts.saveAndFlush(c));
    }

    @Transactional
    public CourtDto updateCourt(long id, CourtRequest req) {
        Court c = courts.findById(id).orElseThrow(() -> ApiException.notFound("Court", id));
        if (courts.existsByNameIgnoreCaseAndIdNot(req.name().trim(), id)) {
            throw ApiException.conflict("COURT_EXISTS", "A court with this name already exists");
        }
        if (c.isActive() && !req.active() && batches.countByCourtIdAndActiveTrue(id) > 0) {
            throw ApiException.conflict("COURT_IN_USE", "Move or turn off this court's batches first");
        }
        applyCourt(c, req);
        return toDto(c);
    }

    private static void applyCourt(Court c, CourtRequest req) {
        c.setName(req.name().trim());
        c.setSurfaceType(req.surfaceType().trim());
        c.setActive(req.active());
    }

    private CourtDto toDto(Court c) {
        return new CourtDto(c.getId(), c.getName(), c.getSurfaceType(), c.isActive(),
                batches.countByCourtIdAndActiveTrue(c.getId()));
    }

    // ---- Coaches ----------------------------------------------------------------------------------------------

    public List<CoachDto> coaches(boolean includeInactive) {
        List<Coach> list = includeInactive ? coaches.findAllByOrderByActiveDescNameAsc()
                : coaches.findByActiveTrueOrderByNameAsc();
        return list.stream().map(this::toDto).toList();
    }

    @Transactional
    public CoachDto createCoach(CoachRequest req) {
        Coach c = new Coach();
        applyCoach(c, req);
        return toDto(coaches.saveAndFlush(c));
    }

    @Transactional
    public CoachDto updateCoach(long id, CoachRequest req) {
        Coach c = coaches.findById(id).orElseThrow(() -> ApiException.notFound("Coach", id));
        if (c.isActive() && !req.active() && batches.countByCoachIdAndActiveTrue(id) > 0) {
            throw ApiException.conflict("COACH_IN_USE", "Give this coach's batches to someone else first");
        }
        applyCoach(c, req);
        return toDto(c);
    }

    private static void applyCoach(Coach c, CoachRequest req) {
        c.setName(req.name().trim());
        c.setTitle(blankToNull(req.title()));
        c.setMobile(blankToNull(req.mobile()));
        c.setActive(req.active());
    }

    private CoachDto toDto(Coach c) {
        return new CoachDto(c.getId(), c.getName(), c.getTitle(), c.getMobile(), Names.initials(c.getName()),
                c.isActive(), batches.countByCoachIdAndActiveTrue(c.getId()));
    }

    // ---- Batches ----------------------------------------------------------------------------------------------

    public List<BatchDto> batches(Long courtId, LocalDate date, boolean includeInactive) {
        List<Batch> list = includeInactive ? batches.findAllForAdmin() : batches.findAllActive();
        return list.stream()
                .filter(b -> courtId == null || b.getCourt().getId().equals(courtId))
                .filter(b -> date == null || b.runsOn(date.getDayOfWeek()))
                .map(b -> BatchDto.of(b, players.countByBatchIdAndActiveTrue(b.getId())))
                .toList();
    }

    @Transactional
    public BatchDto createBatch(BatchRequest req) {
        Batch b = new Batch();
        applyBatch(b, req);
        b = batches.saveAndFlush(b);
        return BatchDto.of(b, 0);
    }

    @Transactional
    public BatchDto updateBatch(long id, BatchRequest req) {
        Batch b = batches.findById(id).orElseThrow(() -> ApiException.notFound("Batch", id));
        long enrolled = players.countByBatchIdAndActiveTrue(id);
        if (b.isActive() && !req.active() && enrolled > 0) {
            throw ApiException.conflict("BATCH_IN_USE", enrolled + " active players are in this batch. Move them first.");
        }
        applyBatch(b, req);
        return BatchDto.of(b, enrolled);
    }

    private void applyBatch(Batch b, BatchRequest req) {
        if (!req.endTime().isAfter(req.startTime())) {
            throw ApiException.rule("BAD_TIMES", "The batch must end after it starts");
        }
        Court court = courts.findById(req.courtId()).filter(Court::isActive)
                .orElseThrow(() -> ApiException.rule("UNKNOWN_COURT", "Pick an active court"));
        Coach coach = coaches.findById(req.coachId()).filter(Coach::isActive)
                .orElseThrow(() -> ApiException.rule("UNKNOWN_COACH", "Pick an active coach"));
        if (req.active()) {
            batches.findByCourtIdAndActiveTrue(court.getId()).stream()
                    .filter(other -> !other.getId().equals(b.getId()))
                    .filter(other -> overlaps(other, req))
                    .findFirst()
                    .ifPresent(clash -> {
                        throw ApiException.conflict("COURT_BOOKED", court.getName() + " is already booked for "
                                + clash.getName() + " at that time");
                    });
        }
        b.setName(req.name().trim());
        b.setCourt(court);
        b.setCoach(coach);
        b.setStartTime(req.startTime());
        b.setEndTime(req.endTime());
        b.setDaysOfWeek(daysToColumn(req.days()));
        b.setLevel(req.level());
        b.setActive(req.active());
    }

    /** Same court, a shared weekday, and time ranges that intersect. */
    static boolean overlaps(Batch other, BatchRequest req) {
        boolean sharedDay = other.days().stream().anyMatch(req.days()::contains);
        return sharedDay && req.startTime().isBefore(other.getEndTime()) && other.getStartTime().isBefore(req.endTime());
    }

    /** {MONDAY, FRIDAY} becomes "MON,FRI", in week order. */
    static String daysToColumn(Set<DayOfWeek> days) {
        return EnumSet.copyOf(days).stream().map(d -> d.name().substring(0, 3)).collect(Collectors.joining(","));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
