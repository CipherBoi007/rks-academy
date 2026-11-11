package in.rks.academy.billing;

import in.rks.academy.billing.BillingDtos.DueDto;
import in.rks.academy.billing.BillingDtos.PaymentDto;
import in.rks.academy.billing.BillingDtos.PaymentsSummary;
import in.rks.academy.billing.BillingDtos.QuoteDto;
import in.rks.academy.billing.BillingDtos.QuoteRequest;
import in.rks.academy.billing.BillingDtos.ReceiptDto;
import in.rks.academy.billing.BillingDtos.RecordPaymentRequest;
import in.rks.academy.common.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import java.time.YearMonth;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Everything here exposes fee amounts, so it is owner-only. */
@Tag(name = "Payments & dues")
@Validated
@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasRole('OWNER')")
public class PaymentController {

    private final PaymentService payments;
    private final BillingService billing;

    public PaymentController(PaymentService payments, BillingService billing) {
        this.payments = payments;
        this.billing = billing;
    }

    @GetMapping("/payments")
    public PageResponse<PaymentDto> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Payment.Mode mode,
            @RequestParam(required = false) Long playerId,
            @RequestParam(defaultValue = "true") boolean includeVoided,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return payments.list(from, to, mode, playerId, includeVoided, page, size);
    }

    @Operation(summary = "Void a wrong payment. It stays on record, stops counting, and the period can be paid again.")
    @PostMapping("/payments/{id}/void")
    public PaymentDto voidPayment(@PathVariable long id, @Valid @RequestBody BillingDtos.VoidRequest req) {
        return payments.voidPayment(id, req.reason());
    }

    @Operation(summary = "Collected, UPI share and pending dues for a month (default: current month)")
    @GetMapping("/payments/summary")
    public PaymentsSummary summary(@RequestParam(required = false) @Pattern(regexp = "\\d{4}-\\d{2}") String month) {
        YearMonth ym = month == null ? YearMonth.from(billing.today()) : YearMonth.parse(month);
        return payments.summary(ym);
    }

    @Operation(summary = "Preview what a payment would charge, without saving it")
    @PostMapping("/payments/quote")
    public QuoteDto quote(@Valid @RequestBody QuoteRequest req) {
        return payments.quote(req.playerId(), req.paidOn());
    }

    @Operation(summary = "Record a payment. Discounts, late and registration fees are applied automatically.")
    @PostMapping("/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentDto record(@Valid @RequestBody RecordPaymentRequest req) {
        return payments.record(req);
    }

    @Operation(summary = "Receipt for RKS/{yy}/{number}, e.g. /receipts/26/1126")
    @GetMapping("/receipts/{yy}/{number}")
    public ReceiptDto receipt(@PathVariable @Pattern(regexp = "\\d{2}") String yy,
                              @PathVariable @Pattern(regexp = "\\d{1,6}") String number) {
        return payments.receipt("RKS/" + yy + "/" + number);
    }

    @Operation(summary = "Players whose current billing period is unpaid, longest overdue first")
    @GetMapping("/dues")
    public PageResponse<DueDto> dues(@RequestParam(defaultValue = "0") @Min(0) int page,
                                     @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return PageResponse.ofList(payments.dues(), page, size);
    }

    @GetMapping("/players/{id}/payments")
    public java.util.List<PaymentDto> forPlayer(@PathVariable long id) {
        return payments.forPlayer(id);
    }
}
