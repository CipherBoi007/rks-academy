package in.rks.academy.batch;

import in.rks.academy.coach.Coach;
import in.rks.academy.common.Names;
import in.rks.academy.common.Refs.CourtRef;
import in.rks.academy.player.Level;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

public record BatchDto(long id, String name, CourtRef court, CoachDto coach, LocalTime startTime, LocalTime endTime,
                       List<DayOfWeek> days, Level level, long playerCount, boolean active) {

    public record CoachDto(long id, String name, String title, String initials) {
        public static CoachDto of(Coach c) {
            return new CoachDto(c.getId(), c.getName(), c.getTitle(), Names.initials(c.getName()));
        }
    }

    public static BatchDto of(Batch b, long playerCount) {
        return new BatchDto(b.getId(), b.getName(), CourtRef.of(b.getCourt()), CoachDto.of(b.getCoach()),
                b.getStartTime(), b.getEndTime(), List.copyOf(b.days()), b.getLevel(), playerCount, b.isActive());
    }
}
