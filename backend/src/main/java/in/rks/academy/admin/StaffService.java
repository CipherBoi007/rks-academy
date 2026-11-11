package in.rks.academy.admin;

import in.rks.academy.auth.TemporaryPin;
import in.rks.academy.coach.Coach;
import in.rks.academy.coach.CoachRepository;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.Names;
import in.rks.academy.security.CurrentUser;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owner-managed logins. New and reset logins get a one-time PIN that must be changed at first sign-in, and every
 * change that should end existing sessions bumps the user's session version.
 */
@Service
@Transactional(readOnly = true)
public class StaffService {

    public record StaffDto(long id, String name, String mobile, AdminUser.Role role, String initials, Long coachId,
                           String coachName, boolean active, boolean mustChangePin, OffsetDateTime createdAt) {
        static StaffDto of(AdminUser u) {
            return new StaffDto(u.getId(), u.getName(), u.getMobile(), u.getRole(), Names.initials(u.getName()),
                    u.getCoach() == null ? null : u.getCoach().getId(),
                    u.getCoach() == null ? null : u.getCoach().getName(), u.isActive(), u.isMustChangePin(),
                    u.getCreatedAt());
        }
    }

    /** {@code temporaryPin} is returned once, on creation or reset, and never stored in plain text. */
    public record StaffWithPin(StaffDto staff, String temporaryPin) {
    }

    public record CreateStaff(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Pattern(regexp = "\\d{10}", message = "Enter a 10-digit mobile number") String mobile,
            @NotNull AdminUser.Role role,
            @Positive Long coachId) {
    }

    public record UpdateStaff(
            @NotBlank @Size(max = 100) String name,
            @NotNull AdminUser.Role role,
            @Positive Long coachId,
            boolean active) {
    }

    private final AdminUserRepository users;
    private final CoachRepository coaches;
    private final PasswordEncoder encoder;

    public StaffService(AdminUserRepository users, CoachRepository coaches, PasswordEncoder encoder) {
        this.users = users;
        this.coaches = coaches;
        this.encoder = encoder;
    }

    public List<StaffDto> list() {
        return users.findAllByOrderByActiveDescRoleAscNameAsc().stream().map(StaffDto::of).toList();
    }

    @Transactional
    public StaffWithPin create(CreateStaff req) {
        if (users.existsByMobile(req.mobile())) {
            throw ApiException.conflict("MOBILE_TAKEN", "A login with this mobile number already exists");
        }
        AdminUser u = new AdminUser();
        u.setName(req.name().trim());
        u.setMobile(req.mobile());
        u.setRole(req.role());
        u.setCoach(coach(req.coachId()));
        String pin = TemporaryPin.generate();
        u.setPinHash(encoder.encode(pin));
        u.setMustChangePin(true);
        return new StaffWithPin(StaffDto.of(users.saveAndFlush(u)), pin);
    }

    @Transactional
    public StaffDto update(long id, UpdateStaff req) {
        AdminUser u = load(id);
        boolean self = Objects.equals(u.getId(), CurrentUser.get().id());
        boolean losesOwner = u.getRole() == AdminUser.Role.OWNER && u.isActive()
                && (req.role() != AdminUser.Role.OWNER || !req.active());
        if (self && (!req.active() || req.role() != u.getRole())) {
            throw ApiException.rule("CANNOT_CHANGE_SELF", "You can't turn off or change the role of your own login");
        }
        if (losesOwner && users.countByRoleAndActiveTrue(AdminUser.Role.OWNER) <= 1) {
            throw ApiException.rule("LAST_OWNER", "The academy needs at least one active owner");
        }
        if (u.getRole() != req.role() || u.isActive() != req.active()) {
            u.revokeSessions();
        }
        u.setName(req.name().trim());
        u.setRole(req.role());
        u.setCoach(coach(req.coachId()));
        u.setActive(req.active());
        return StaffDto.of(u);
    }

    /** Issues a new one-time PIN and signs the user out everywhere. */
    @Transactional
    public StaffWithPin resetPin(long id) {
        AdminUser u = load(id);
        if (!u.isActive()) {
            throw ApiException.rule("INACTIVE", "Turn this login back on before resetting its PIN");
        }
        String pin = TemporaryPin.generate();
        u.setPinHash(encoder.encode(pin));
        u.setMustChangePin(true);
        u.revokeSessions();
        return new StaffWithPin(StaffDto.of(u), pin);
    }

    private AdminUser load(long id) {
        return users.findWithCoachById(id).orElseThrow(() -> ApiException.notFound("Login", id));
    }

    private Coach coach(Long id) {
        if (id == null) {
            return null;
        }
        return coaches.findById(id).filter(Coach::isActive)
                .orElseThrow(() -> ApiException.rule("UNKNOWN_COACH", "Pick an active coach"));
    }
}
