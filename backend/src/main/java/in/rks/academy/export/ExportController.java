package in.rks.academy.export;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** CSV downloads. They contain fee amounts and parent phone numbers, so they are owner-only and never cached. */
@Tag(name = "Exports")
@RestController
@RequestMapping("/api/v1/exports")
@PreAuthorize("hasRole('OWNER')")
public class ExportController {

    private static final MediaType CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final ExportService exports;
    private final Clock clock;

    public ExportController(ExportService exports, Clock clock) {
        this.exports = exports;
        this.clock = clock;
    }

    @Operation(summary = "Payments between two dates (default: this month), voided ones included and marked")
    @GetMapping("/payments.csv")
    public ResponseEntity<byte[]> payments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        YearMonth month = YearMonth.now(clock);
        LocalDate start = from == null ? month.atDay(1) : from;
        LocalDate end = to == null ? month.atEndOfMonth() : to;
        return file("rks-payments-" + start + "-to-" + end + ".csv", exports.payments(start, end));
    }

    @GetMapping("/dues.csv")
    public ResponseEntity<byte[]> dues() {
        return file("rks-dues-" + LocalDate.now(clock) + ".csv", exports.dues());
    }

    @GetMapping("/players.csv")
    public ResponseEntity<byte[]> players() {
        return file("rks-players-" + LocalDate.now(clock) + ".csv", exports.players());
    }

    @Operation(summary = "Attendance between two dates (default: this month)")
    @GetMapping("/attendance.csv")
    public ResponseEntity<byte[]> attendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        YearMonth month = YearMonth.now(clock);
        LocalDate start = from == null ? month.atDay(1) : from;
        LocalDate end = to == null ? month.atEndOfMonth() : to;
        return file("rks-attendance-" + start + "-to-" + end + ".csv", exports.attendance(start, end));
    }

    private static ResponseEntity<byte[]> file(String name, byte[] body) {
        return ResponseEntity.ok()
                .contentType(CSV)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .cacheControl(CacheControl.noStore())
                .body(body);
    }
}
