package in.rks.academy.player;

import in.rks.academy.attendance.AttendanceRecord;
import in.rks.academy.attendance.AttendanceRepository;
import in.rks.academy.batch.Batch;
import in.rks.academy.batch.BatchRepository;
import in.rks.academy.billing.BillingService;
import in.rks.academy.billing.BillingService.FeeState;
import in.rks.academy.billing.FeePlan;
import in.rks.academy.billing.FeePlanRepository;
import in.rks.academy.billing.FeeRules;
import in.rks.academy.coach.Coach;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.FileStorageService;
import in.rks.academy.common.Names;
import in.rks.academy.common.PageResponse;
import in.rks.academy.common.Refs.BatchRef;
import in.rks.academy.common.Refs.CourtRef;
import in.rks.academy.common.Refs.PlanRef;
import in.rks.academy.common.Refs.PlayerRef;
import in.rks.academy.player.PlayerDtos.AttendanceDay;
import in.rks.academy.player.PlayerDtos.BatchInfo;
import in.rks.academy.player.PlayerDtos.CoachInfo;
import in.rks.academy.player.PlayerDtos.FeeStatus;
import in.rks.academy.player.PlayerDtos.LevelStep;
import in.rks.academy.player.PlayerDtos.ContactInfo;
import in.rks.academy.player.PlayerDtos.PlayerAttendance;
import in.rks.academy.player.PlayerDtos.PlayerDetail;
import in.rks.academy.player.PlayerDtos.PlayerRequest;
import in.rks.academy.player.PlayerDtos.PlayerSummary;
import in.rks.academy.player.PlayerDtos.ProgressDto;
import in.rks.academy.player.PlayerDtos.SkillDto;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class PlayerService {

    public record Filter(String q, Long batchId, Long courtId, Level level, FeeStatus feeStatus, boolean active) {
    }

    private final PlayerRepository players;
    private final PlayerLevelHistoryRepository levels;
    private final PlayerSkillRepository skills;
    private final BatchRepository batches;
    private final FeePlanRepository plans;
    private final AttendanceRepository attendance;
    private final BillingService billing;
    private final FileStorageService files;

    public PlayerService(PlayerRepository players, PlayerLevelHistoryRepository levels, PlayerSkillRepository skills,
                         BatchRepository batches, FeePlanRepository plans, AttendanceRepository attendance,
                         BillingService billing, FileStorageService files) {
        this.players = players;
        this.levels = levels;
        this.skills = skills;
        this.batches = batches;
        this.plans = plans;
        this.attendance = attendance;
        this.billing = billing;
        this.files = files;
    }

    public PageResponse<PlayerSummary> search(Filter f, int page, int size) {
        Specification<Player> spec = (root, q, cb) -> cb.equal(root.get("active"), f.active());
        if (f.q() != null && !f.q().isBlank()) {
            String like = "%" + f.q().trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.or(cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("code")), like)));
        }
        if (f.batchId() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("batch").get("id"), f.batchId()));
        }
        if (f.courtId() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("batch").get("court").get("id"), f.courtId()));
        }
        if (f.level() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("level"), f.level()));
        }
        // Fee status is derived, so resolve the matching ids first and filter on them.
        Map<Long, FeeState> states = billing.feeStates(players.findByActiveTrue());
        if (f.feeStatus() != null) {
            boolean wantDue = f.feeStatus() == FeeStatus.DUE;
            Set<Long> ids = states.entrySet().stream().filter(e -> e.getValue().due() == wantDue)
                    .map(Map.Entry::getKey).collect(Collectors.toSet());
            spec = spec.and((root, q, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("id").in(ids));
        }
        var pageable = PageRequest.of(page, size, Sort.by("code"));
        return PageResponse.of(players.findAll(spec, pageable), p -> summary(p, states.get(p.getId())));
    }

    public PlayerDetail get(long id) {
        Player p = load(id);
        FeeState state = billing.feeStates(List.of(p)).get(id);
        return detail(p, state);
    }

    @Transactional
    public PlayerDetail create(PlayerRequest req) {
        Player p = new Player();
        p.setCode("RKS" + players.nextCodeNumber());
        LocalDate join = req.joinDate() == null ? billing.today() : req.joinDate();
        validateJoin(join);
        p.setJoinDate(join);
        p.setPlanStartDate(FeeRules.firstOfMonth(join));
        apply(p, req);
        p = players.saveAndFlush(p);
        levels.save(new PlayerLevelHistory(p.getId(), p.getLevel(), join));
        return get(p.getId());
    }

    @Transactional
    public PlayerDetail update(long id, PlayerRequest req) {
        Player p = load(id);
        Level before = p.getLevel();
        Long planBefore = p.getFeePlan().getId();
        if (req.joinDate() != null && !req.joinDate().equals(p.getJoinDate())) {
            validateJoin(req.joinDate());
            p.setJoinDate(req.joinDate());
        }
        apply(p, req);
        if (!planBefore.equals(p.getFeePlan().getId())) {
            // A new plan starts after whatever has already been paid for.
            p.setPlanStartDate(billing.planStartForChange(p));
        }
        if (before != p.getLevel() && !levels.existsByPlayerIdAndLevel(id, p.getLevel())) {
            levels.save(new PlayerLevelHistory(id, p.getLevel(), billing.today()));
        }
        return get(id);
    }

    /** Soft delete: history (payments, attendance) must stay intact. */
    @Transactional
    public void deactivate(long id) {
        load(id).setActive(false);
    }

    @Transactional
    public String updatePhoto(long id, MultipartFile file) {
        Player p = load(id);
        String url = files.store(FileStorageService.Kind.PLAYER_PHOTO, p.getCode(), file);
        files.deleteQuietly(FileStorageService.Kind.PLAYER_PHOTO, p.getPhotoUrl());
        p.setPhotoUrl(url);
        return url;
    }

    @Transactional
    public void removePhoto(long id) {
        Player p = load(id);
        files.deleteQuietly(FileStorageService.Kind.PLAYER_PHOTO, p.getPhotoUrl());
        p.setPhotoUrl(null);
    }

    /** One calendar month of attendance (the profile calendar). Null means the current month. */
    public PlayerAttendance attendanceMonth(long id, YearMonth month) {
        YearMonth m = month == null ? YearMonth.from(billing.today()) : month;
        return attendance(id, m.atDay(1), m.atEndOfMonth());
    }

    public PlayerAttendance attendance(long id, LocalDate from, LocalDate to) {
        load(id);
        LocalDate end = to == null ? billing.today() : to;
        LocalDate start = from == null ? end.minusWeeks(14) : from;
        if (start.isAfter(end) || start.isBefore(end.minusYears(1))) {
            throw ApiException.badRequest("BAD_RANGE", "Pick a range of up to one year");
        }
        List<AttendanceDay> days = attendance.findByPlayerIdAndDateBetweenOrderByDateAsc(id, start, end).stream()
                .map(a -> new AttendanceDay(a.getDate(), a.getStatus())).toList();
        long present = days.stream().filter(d -> d.status() == AttendanceRecord.Status.PRESENT).count();
        long absent = days.size() - present;
        int pct = days.isEmpty() ? 0 : (int) Math.round(present * 100.0 / days.size());
        return new PlayerAttendance(start, end, days, present, absent, pct);
    }

    public ProgressDto progress(long id) {
        Player p = load(id);
        List<LevelStep> history = levels.findByPlayerIdOrderByAchievedOnAsc(id).stream()
                .map(h -> new LevelStep(h.getLevel(), h.getAchievedOn())).toList();
        List<SkillDto> scores = skills.findByPlayerId(id).stream()
                .sorted(Comparator.comparing(PlayerSkill::getSkill))
                .map(s -> new SkillDto(s.getSkill(), s.getScore(), s.getUpdatedOn())).toList();
        return new ProgressDto(p.getLevel(), history, scores);
    }

    @Transactional
    public ProgressDto updateSkills(long id, Map<PlayerSkill.Skill, Integer> scores) {
        load(id);
        LocalDate today = billing.today();
        scores.forEach((skill, score) -> {
            PlayerSkill s = skills.findById(new PlayerSkill.Key(id, skill))
                    .orElseGet(() -> new PlayerSkill(id, skill, score, today));
            s.setScore(score);
            s.setUpdatedOn(today);
            skills.save(s);
        });
        return progress(id);
    }

    private void apply(Player p, PlayerRequest req) {
        Batch batch = batches.findById(req.batchId()).filter(Batch::isActive)
                .orElseThrow(() -> ApiException.rule("UNKNOWN_BATCH", "Pick an active batch"));
        FeePlan plan = plans.findById(req.feePlanId()).filter(FeePlan::isActive)
                .orElseThrow(() -> ApiException.rule("UNKNOWN_PLAN", "Pick an active fee plan"));
        p.setName(req.name().trim());
        p.setDob(req.dob());
        p.setGender(req.gender());
        applyContact(p, req);
        p.setContactMobile(req.contactMobile());
        p.setContactOccupation(blankToNull(req.contactOccupation()));
        p.setBloodGroup(blankToNull(req.bloodGroup()));
        p.setSchool(blankToNull(req.school()));
        p.setAddress(blankToNull(req.address()));
        p.setLevel(req.level());
        p.setBatch(batch);
        p.setFeePlan(plan);
        p.setSiblingGroupId(siblingGroupFor(p, req.siblingOfPlayerId()));
    }

    /**
     * An adult can manage their own account; anyone younger needs a parent or guardian. For SELF the contact name
     * is the player's own, so it can never drift from it.
     */
    private void applyContact(Player p, PlayerRequest req) {
        if (req.contactRelation() == Player.ContactRelation.SELF) {
            if (p.ageOn(billing.today()) < Player.ADULT_AGE) {
                throw ApiException.rule("MINOR_NEEDS_GUARDIAN",
                        "Players under " + Player.ADULT_AGE + " need a parent or guardian as their contact");
            }
            p.setContactName(p.getName());
        } else {
            String name = blankToNull(req.contactName());
            if (name == null) {
                throw ApiException.rule("CONTACT_NAME_REQUIRED", "Enter the "
                        + (req.contactRelation() == Player.ContactRelation.PARENT ? "parent" : "guardian") + "'s name");
            }
            p.setContactName(name);
        }
        p.setContactRelation(req.contactRelation());
    }

    /** Joins the given player's sibling group, creating one if they don't have a group yet. */
    private UUID siblingGroupFor(Player p, Long siblingOfId) {
        if (siblingOfId == null) {
            return null;
        }
        if (Objects.equals(siblingOfId, p.getId())) {
            throw ApiException.rule("SELF_SIBLING", "A player can't be their own sibling");
        }
        Player other = players.findById(siblingOfId)
                .orElseThrow(() -> ApiException.rule("UNKNOWN_SIBLING", "That sibling wasn't found"));
        if (other.getSiblingGroupId() == null) {
            other.setSiblingGroupId(UUID.randomUUID());
        }
        return other.getSiblingGroupId();
    }

    private void validateJoin(LocalDate join) {
        if (join.isAfter(billing.today().plusMonths(1))) {
            throw ApiException.rule("JOIN_TOO_FAR", "Join date can be at most a month ahead");
        }
    }

    private Player load(long id) {
        return players.findDetailed(id).orElseThrow(() -> ApiException.notFound("Player", id));
    }

    private PlayerSummary summary(Player p, FeeState state) {
        return new PlayerSummary(p.getId(), p.getCode(), p.getName(), Names.initials(p.getName()), p.getPhotoUrl(),
                p.ageOn(billing.today()), p.getGender(), p.getLevel(), BatchRef.of(p.getBatch()),
                CourtRef.of(p.getBatch().getCourt()), status(state));
    }

    private PlayerDetail detail(Player p, FeeState state) {
        Batch b = p.getBatch();
        Coach c = b.getCoach();
        List<PlayerRef> siblings = p.getSiblingGroupId() == null ? List.of()
                : players.findBySiblingGroupId(p.getSiblingGroupId()).stream()
                .filter(s -> !s.getId().equals(p.getId()) && s.isActive())
                .sorted(Comparator.comparing(Player::getJoinDate))
                .map(PlayerRef::of).toList();
        return new PlayerDetail(p.getId(), p.getCode(), p.getName(), Names.initials(p.getName()), p.getPhotoUrl(),
                p.getDob(), p.ageOn(billing.today()), p.getGender(), p.getBloodGroup(), p.getSchool(),
                p.getAddress(), p.getLevel(), status(state),
                new ContactInfo(p.getContactRelation(), p.getContactName(), p.getContactMobile(),
                        p.getContactOccupation()), p.getJoinDate(),
                new BatchInfo(b.getId(), b.getName(), b.getStartTime(), b.getEndTime()),
                CourtRef.of(b.getCourt()),
                new CoachInfo(c.getId(), c.getName(), c.getTitle(), Names.initials(c.getName())),
                PlanRef.of(p.getFeePlan()), p.getSiblingGroupId(), siblings, p.isActive());
    }

    private static FeeStatus status(FeeState state) {
        return state != null && state.due() ? FeeStatus.DUE : FeeStatus.PAID;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
