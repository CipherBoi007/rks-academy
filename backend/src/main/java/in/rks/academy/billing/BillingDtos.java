package in.rks.academy.billing;

import com.fasterxml.jackson.annotation.JsonInclude;
import in.rks.academy.common.Refs.PlanRef;
import in.rks.academy.common.Refs.PlayerRef;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class BillingDtos {

    private BillingDtos() {
    }

    // ---- Fee policy -------------------------------------------------------------------------------------------

    public record PolicyDto(BigDecimal registrationFee, BigDecimal siblingDiscount2ndPct,
                            BigDecimal siblingDiscount3rdPct, int lateFeeAfterDay, BigDecimal lateFeeBase,
                            BigDecimal lateFeePerDay, BigDecimal lateFeeMax, LocalDate effectiveFrom) {
        static PolicyDto of(FeePolicy p) {
            return new PolicyDto(p.getRegistrationFee(), p.getSiblingDiscount2ndPct(), p.getSiblingDiscount3rdPct(),
                    p.getLateFeeAfterDay(), p.getLateFeeBase(), p.getLateFeePerDay(), p.getLateFeeMax(),
                    p.getEffectiveFrom());
        }
    }

    /** {@code pending} is a scheduled change that starts with the next billing cycle, if any. */
    public record PolicyView(PolicyDto current, PolicyDto pending) {
    }

    public record PolicyRequest(
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal registrationFee,
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal siblingDiscount2ndPct,
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal siblingDiscount3rdPct,
            @Min(1) @Max(28) int lateFeeAfterDay,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal lateFeeBase,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal lateFeePerDay,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal lateFeeMax) {
    }

    // ---- Fee plans --------------------------------------------------------------------------------------------

    /** {@code price} is null for coaches, who never see fee amounts. */
    public record FeePlanDto(long id, String name, String levelLabel, BigDecimal price, int periodMonths,
                             int sessionsPerWeek, List<String> perks, boolean mostPopular, long playerCount) {
    }

    public record FeePlanRequest(
            @NotBlank @Size(max = 60) String name,
            @NotBlank @Size(max = 80) String levelLabel,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal price,
            @Min(1) @Max(12) int periodMonths,
            @Min(1) @Max(7) int sessionsPerWeek,
            @NotNull @Size(max = 6) List<@NotBlank @Size(max = 120) String> perks,
            boolean mostPopular) {
    }

    // ---- Payments ---------------------------------------------------------------------------------------------

    public record QuoteRequest(@NotNull @Positive Long playerId, LocalDate paidOn) {
    }

    /**
     * {@code amount} is optional. When it is absent, the computed total is charged. When it differs from that
     * total, the difference is stored as an adjustment and {@code note} must say why.
     */
    public record RecordPaymentRequest(
            @NotNull @Positive Long playerId,
            @NotNull Payment.Mode mode,
            LocalDate paidOn,
            @Positive @Digits(integer = 8, fraction = 2) BigDecimal amount,
            @Size(max = 200) String note) {
    }

    public record QuoteDto(PlayerRef player, PlanRef plan, LocalDate periodFrom, LocalDate periodTo,
                           BigDecimal planAmount, int siblingRank, BigDecimal siblingDiscountPct,
                           BigDecimal siblingDiscount, BigDecimal lateFee, BigDecimal registrationFee,
                           BigDecimal total) {
    }

    public record PaymentDto(long id, String receiptNo, PlayerRef player, PlanRef plan, BigDecimal planAmount,
                             BigDecimal siblingDiscount, BigDecimal lateFee, BigDecimal registrationFee,
                             BigDecimal adjustment, BigDecimal amount, Payment.Mode mode, LocalDate paidOn,
                             LocalDate periodFrom, LocalDate periodTo, String note, boolean voided,
                             OffsetDateTime voidedAt, String voidReason) {
        static PaymentDto of(Payment p) {
            return new PaymentDto(p.getId(), p.getReceiptNo(), PlayerRef.of(p.getPlayer()), PlanRef.of(p.getPlan()),
                    p.getPlanAmount(), p.getSiblingDiscount(), p.getLateFee(), p.getRegistrationFee(),
                    p.getAdjustment(), p.getAmount(), p.getMode(), p.getPaidOn(), p.getPeriodFrom(),
                    p.getPeriodTo(), p.getNote(), p.isVoided(), p.getVoidedAt(), p.getVoidReason());
        }
    }

    public record VoidRequest(@NotBlank @Size(min = 3, max = 200) String reason) {
    }

    public record PaymentsSummary(String month, BigDecimal collected, long paymentCount, BigDecimal upiAmount,
                                  int upiPct, BigDecimal pending, long dueCount) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DueDto(PlayerRef player, String batchName, PlanRef plan, LocalDate periodFrom, LocalDate periodTo,
                         long daysOverdue, BigDecimal planAmount, BigDecimal siblingDiscount, BigDecimal lateFee,
                         BigDecimal registrationFee, BigDecimal amount) {
    }

    // ---- Receipt ----------------------------------------------------------------------------------------------

    public record ReceiptLine(String label, BigDecimal amount) {
    }

    public record ReceiptDto(String receiptNo, LocalDate issuedOn, String academyName, String academyAddress,
                             String academyPhone, String playerCode, String playerName, String parentName,
                             String batchName, String planName, LocalDate periodFrom, LocalDate periodTo,
                             List<ReceiptLine> lines, BigDecimal total, String totalInWords, Payment.Mode mode,
                             String recordedBy, String note, boolean voided, OffsetDateTime voidedAt,
                             String voidReason) {
    }
}
