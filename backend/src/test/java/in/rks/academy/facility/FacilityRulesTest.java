package in.rks.academy.facility;

import static org.assertj.core.api.Assertions.assertThat;

import in.rks.academy.batch.Batch;
import in.rks.academy.facility.FacilityService.BatchRequest;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FacilityRulesTest {

    static Batch existing(String days, String start, String end) {
        Batch b = new Batch();
        b.setDaysOfWeek(days);
        b.setStartTime(LocalTime.parse(start));
        b.setEndTime(LocalTime.parse(end));
        return b;
    }

    static BatchRequest request(Set<DayOfWeek> days, String start, String end) {
        return new BatchRequest("New", 1L, 1L, LocalTime.parse(start), LocalTime.parse(end), days, null, true);
    }

    @Test
    void overlappingTimeOnASharedDayClashes() {
        Batch morning = existing("MON,TUE,WED,THU,FRI", "06:00", "07:00");
        assertThat(FacilityService.overlaps(morning, request(EnumSet.of(DayOfWeek.MONDAY), "06:30", "07:30"))).isTrue();
        assertThat(FacilityService.overlaps(morning, request(EnumSet.of(DayOfWeek.FRIDAY), "05:00", "08:00"))).isTrue();
    }

    @Test
    void backToBackSlotsAndOtherDaysDoNotClash() {
        Batch morning = existing("MON,TUE,WED,THU,FRI", "06:00", "07:00");
        assertThat(FacilityService.overlaps(morning, request(EnumSet.of(DayOfWeek.MONDAY), "07:00", "08:00"))).isFalse();
        assertThat(FacilityService.overlaps(morning, request(EnumSet.of(DayOfWeek.SATURDAY), "06:00", "07:00"))).isFalse();
    }

    @Test
    void daysAreStoredInWeekOrder() {
        assertThat(FacilityService.daysToColumn(Set.of(DayOfWeek.SATURDAY, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY)))
                .isEqualTo("MON,WED,SAT");
    }
}
