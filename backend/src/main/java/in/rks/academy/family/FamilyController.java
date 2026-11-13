package in.rks.academy.family;

import in.rks.academy.billing.BillingDtos.PaymentDto;
import in.rks.academy.billing.BillingDtos.QuoteDto;
import in.rks.academy.billing.BillingDtos.ReceiptDto;
import in.rks.academy.common.ApiException;
import in.rks.academy.common.PageResponse;
import in.rks.academy.family.FamilyAuthService.FamilySession;
import in.rks.academy.family.FamilyService.Family;
import in.rks.academy.player.PlayerDtos.PlayerAttendance;
import in.rks.academy.player.PlayerDtos.PlayerDetail;
import in.rks.academy.player.PlayerDtos.ProgressDto;
import in.rks.academy.product.Product;
import in.rks.academy.product.ProductDtos.ProductDto;
import in.rks.academy.product.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.YearMonth;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The family portal API: sign-in by mobile number and PIN, then read-only access to the parent's own children. */
@Tag(name = "Family portal")
@Validated
@RestController
@RequestMapping("/api/v1/family")
public class FamilyController {

    public record LoginRequest(
            @NotBlank @Pattern(regexp = "\\d{10}", message = "Enter your 10-digit mobile number") String mobile,
            @NotBlank @Pattern(regexp = "\\d{6,12}", message = "Enter your PIN (6 to 12 digits)") String pin) {
    }

    public record SetPinRequest(
            @NotBlank @Pattern(regexp = "\\d{10}", message = "Enter your 10-digit mobile number") String mobile,
            @NotBlank @Pattern(regexp = "\\d{6,12}", message = "Enter your current PIN") String currentPin,
            @NotBlank @Pattern(regexp = "\\d{6,12}", message = "PIN is 6 to 12 digits") String newPin) {
    }

    private final FamilyAuthService auth;
    private final FamilyService family;
    private final ProductService products;

    public FamilyController(FamilyAuthService auth, FamilyService family, ProductService products) {
        this.auth = auth;
        this.family = family;
        this.products = products;
    }

    // ---- Sign-in (public) ---------------------------------------------------------------------------------

    @Operation(summary = "Sign in with the parent's mobile number and PIN. A one-time PIN returns mustChangePin "
            + "and no token: call set-pin with it first.")
    @PostMapping("/auth/login")
    public ResponseEntity<FamilySession> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(auth.login(req.mobile(), req.pin()));
    }

    @Operation(summary = "Replace the parent's PIN (the one-time PIN, or their own) and sign in")
    @PostMapping("/auth/set-pin")
    public ResponseEntity<FamilySession> setPin(@Valid @RequestBody SetPinRequest req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(auth.setPin(req.mobile(), req.currentPin(), req.newPin()));
    }

    // ---- The parent's own children ------------------------------------------------------------------------

    @GetMapping("/me")
    public Family me() {
        return family.family();
    }

    @Operation(summary = "Sign this parent out on every device")
    @PostMapping("/sign-out-everywhere")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signOutEverywhere() {
        auth.signOutEverywhere(FamilyService.current().accountId());
    }

    @GetMapping("/children/{id}")
    public PlayerDetail child(@PathVariable long id) {
        return family.child(id);
    }

    @Operation(summary = "One calendar month of a child's attendance, e.g. ?month=2026-10. Defaults to the current month.")
    @GetMapping("/children/{id}/attendance")
    public PlayerAttendance attendance(
            @PathVariable long id,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return family.attendance(id, month);
    }

    @GetMapping("/children/{id}/progress")
    public ProgressDto progress(@PathVariable long id) {
        return family.progress(id);
    }

    @GetMapping("/children/{id}/payments")
    public List<PaymentDto> payments(@PathVariable long id) {
        return family.payments(id);
    }

    @Operation(summary = "What is due now for this child; 204 when nothing is")
    @GetMapping("/children/{id}/due")
    public ResponseEntity<QuoteDto> due(@PathVariable long id) {
        QuoteDto due = family.due(id);
        return due == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(due);
    }

    @GetMapping("/receipts/{yy}/{number}")
    public ReceiptDto receipt(@PathVariable @Pattern(regexp = "\\d{2}") String yy,
                              @PathVariable @Pattern(regexp = "\\d{1,6}") String number) {
        return family.receipt("RKS/" + yy + "/" + number);
    }

    // ---- RKS Pro Shop, with the academy's offers (ads appear only in the family portal) -----------------

    @GetMapping("/shop/products")
    public PageResponse<ProductDto> products(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) Product.Category category,
                                             @RequestParam(defaultValue = "0") @Min(0) int page,
                                             @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        return products.search(q, category, false, page, size);
    }

    @GetMapping("/shop/products/{id}")
    public ProductDto product(@PathVariable long id) {
        ProductDto product = products.get(id);
        if (!product.active()) {
            throw ApiException.notFound("Product", id);
        }
        return product;
    }

    @GetMapping("/shop/products/{id}/related")
    public List<ProductDto> related(@PathVariable long id) {
        return products.related(id, 4);
    }

    @Operation(summary = "The advertised product for a placement, or 204 when there is none")
    @GetMapping("/shop/ads")
    public ResponseEntity<ProductDto> ad(@RequestParam Product.AdPlacement placement) {
        return products.ad(placement).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }
}
