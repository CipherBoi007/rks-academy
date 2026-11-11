package in.rks.academy.batch;

import in.rks.academy.coach.Coach;
import in.rks.academy.common.BaseEntity;
import in.rks.academy.court.Court;
import in.rks.academy.player.Level;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "batch")
public class Batch extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "court_id")
    private Court court;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coach_id")
    private Coach coach;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    /** Comma-separated three-letter days, e.g. "MON,TUE,WED,THU,FRI". */
    @Column(name = "days_of_week", nullable = false)
    private String daysOfWeek;

    @Enumerated(EnumType.STRING)
    private Level level;

    @Column(nullable = false)
    private boolean active = true;

    public Set<DayOfWeek> days() {
        return Arrays.stream(daysOfWeek.split(","))
                .map(String::trim)
                .map(Batch::parseDay)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(DayOfWeek.class)));
    }

    public boolean runsOn(DayOfWeek day) {
        return days().contains(day);
    }

    private static DayOfWeek parseDay(String abbreviation) {
        return Arrays.stream(DayOfWeek.values())
                .filter(d -> d.name().startsWith(abbreviation))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Unknown day " + abbreviation));
    }
}
