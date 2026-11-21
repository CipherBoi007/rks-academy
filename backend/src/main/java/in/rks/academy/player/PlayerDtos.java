package in.rks.academy.player;

import in.rks.academy.attendance.AttendanceRecord;
import in.rks.academy.common.Refs.BatchRef;
import in.rks.academy.common.Refs.CourtRef;
import in.rks.academy.common.Refs.PlanRef;
import in.rks.academy.common.Refs.PlayerRef;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class PlayerDtos {

    private PlayerDtos() {
    }

    /** LEFT: the player has left the academy, so nothing is due. */
    public enum FeeStatus { PAID, DUE, LEFT }

    public record PlayerSummary(long id, String code, String name, String initials, String photoUrl, int age,
                                Player.Gender gender, Level level, BatchRef batch, CourtRef court,
                                FeeStatus feeStatus) {
    }

    /** Who manages the player's account. For SELF, name is the player's own. */
    public record ContactInfo(Player.ContactRelation relation, String name, String mobile) {
    }

    public record BatchInfo(long id, String name, LocalTime startTime, LocalTime endTime) {
    }

    public record CoachInfo(long id, String name, String title, String initials) {
    }

    public record PlayerDetail(long id, String code, String name, String initials, String photoUrl, LocalDate dob,
                               int age, Player.Gender gender, String bloodGroup, String address,
                               Level level, FeeStatus feeStatus, ContactInfo contact, LocalDate joinDate,
                               BatchInfo batch, CourtRef court, CoachInfo coach, PlanRef plan, UUID siblingGroupId,
                               List<PlayerRef> siblings, boolean active, boolean deletable) {
    }

    public record PlayerRequest(
            @NotBlank @Size(max = 100) String name,
            @NotNull @Past LocalDate dob,
            @NotNull Player.Gender gender,
            @NotNull Player.ContactRelation contactRelation,
            /* Required for a parent or guardian; ignored for SELF, where it is the player's own name. */
            @Size(max = 100) String contactName,
            @NotBlank @Pattern(regexp = "\\d{10}", message = "Enter a 10-digit mobile number") String contactMobile,
            @Pattern(regexp = "A\\+|A-|B\\+|B-|AB\\+|AB-|O\\+|O-", message = "Pick a valid blood group")
            String bloodGroup,
            @Size(max = 200) String address,
            @NotNull Level level,
            @NotNull @Positive Long batchId,
            @NotNull @Positive Long feePlanId,
            LocalDate joinDate,
            @Positive Long siblingOfPlayerId) {
    }

    public record SkillsRequest(@NotEmpty Map<PlayerSkill.Skill, @NotNull @Min(0) @Max(100) Integer> scores) {
    }

    public record SkillDto(PlayerSkill.Skill skill, int score, LocalDate updatedOn) {
    }

    public record LevelStep(Level level, LocalDate achievedOn) {
    }

    public record ProgressDto(Level current, List<LevelStep> history, List<SkillDto> skills) {
    }

    public record AttendanceDay(LocalDate date, AttendanceRecord.Status status) {
    }

    public record PlayerAttendance(LocalDate from, LocalDate to, List<AttendanceDay> days, long present,
                                   long absent, int pct) {
    }

    public record PhotoResponse(String photoUrl) {
    }
}
