package in.rks.academy.family;

import in.rks.academy.family.PaymentReportService.RejectRequest;
import in.rks.academy.family.PaymentReportService.ReportDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** UPI payments reported by parents in the family app, for the owner to check against the bank. */
@Tag(name = "Payment reports")
@RestController
@RequestMapping("/api/v1/payment-reports")
@PreAuthorize("hasRole('OWNER')")
public class PaymentReportController {

    private final PaymentReportService reports;

    public PaymentReportController(PaymentReportService reports) {
        this.reports = reports;
    }

    @Operation(summary = "Waiting reports (oldest first), then those decided in the last 30 days")
    @GetMapping
    public List<ReportDto> list() {
        return reports.forReview();
    }

    @Operation(summary = "Confirm a report: records a UPI payment and receipt for each child it covers")
    @PostMapping("/{id}/confirm")
    public ReportDto confirm(@PathVariable long id) {
        return reports.confirm(id);
    }

    @Operation(summary = "Reject a report with a reason the parent will see; nothing is recorded")
    @PostMapping("/{id}/reject")
    public ReportDto reject(@PathVariable long id, @Valid @RequestBody RejectRequest req) {
        return reports.reject(id, req.reason());
    }
}
