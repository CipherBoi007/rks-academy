package in.rks.academy.attendance;

import in.rks.academy.attendance.AttendanceService.SaveRequest;
import in.rks.academy.attendance.AttendanceService.Sheet;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Attendance")
@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {

    private final AttendanceService attendance;

    public AttendanceController(AttendanceService attendance) {
        this.attendance = attendance;
    }

    @Operation(summary = "Roster and saved marks for a batch on a date")
    @GetMapping
    public Sheet sheet(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                       @RequestParam long batchId) {
        return attendance.sheet(date, batchId);
    }

    @Operation(summary = "Save marks for a batch in bulk (upsert). Owners and coaches.")
    @PostMapping
    public Sheet save(@Valid @RequestBody SaveRequest req) {
        return attendance.save(req);
    }
}
