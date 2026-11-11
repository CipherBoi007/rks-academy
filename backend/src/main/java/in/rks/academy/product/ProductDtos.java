package in.rks.academy.product;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ProductDtos {

    private ProductDtos() {
    }

    public record SpecDto(@NotBlank @Size(max = 60) String label, @NotBlank @Size(max = 120) String value) {
    }

    public record VariantGroup(String name, List<String> values) {
    }

    public record AdDto(Product.AdPlacement placement, String headline, String highlight, String copy,
                        String image) {
    }

    public record ProductDto(long id, String brand, Product.Category category, String name, String description,
                             BigDecimal price, BigDecimal mrp, int discountPct, BigDecimal savings,
                             BigDecimal rating, int reviewCount, Integer stock, String tagLabel, List<String> images,
                             List<SpecDto> specs, List<VariantGroup> variants, AdDto ad, boolean active) {

        static ProductDto of(Product p) {
            BigDecimal savings = p.getMrp().subtract(p.getPrice()).max(BigDecimal.ZERO);
            int pct = p.getMrp().signum() == 0 ? 0
                    : savings.multiply(BigDecimal.valueOf(100)).divide(p.getMrp(), 0, RoundingMode.HALF_UP).intValue();
            Map<String, List<String>> groups = new LinkedHashMap<>();
            p.getVariants().forEach(v -> groups.computeIfAbsent(v.getGroupName(), k -> new java.util.ArrayList<>())
                    .add(v.getValue()));
            AdDto ad = p.isAdvertised() && p.getAdPlacement() != null
                    ? new AdDto(p.getAdPlacement(), p.getAdHeadline(), p.getAdHighlight(), p.getAdCopy(),
                    p.getAdImage())
                    : null;
            return new ProductDto(p.getId(), p.getBrand(), p.getCategory(), p.getName(), p.getDescription(),
                    p.getPrice(), p.getMrp(), pct, savings, p.getRating(), p.getReviewCount(), p.getStock(),
                    p.getTagLabel(), List.copyOf(p.getImages()),
                    p.getSpecs().stream().map(s -> new SpecDto(s.getLabel(), s.getValue())).toList(),
                    groups.entrySet().stream().map(e -> new VariantGroup(e.getKey(), e.getValue())).toList(),
                    ad, p.isActive());
        }
    }

    public record VariantInput(@NotBlank @Size(max = 40) String group, @NotBlank @Size(max = 40) String value) {
    }

    /** Images are either bundled demo files or photos uploaded through the shop editor; never external URLs. */
    static final String IMAGE_PATH = "^/(demo|api/v1/files/products)/[A-Za-z0-9._/-]{1,200}$";

    public record ProductRequest(
            @NotBlank @Size(max = 40) String brand,
            @NotNull Product.Category category,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 2000) String description,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal price,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal mrp,
            @DecimalMin("0") @DecimalMax("5") BigDecimal rating,
            @Min(0) int reviewCount,
            @Min(0) Integer stock,
            @Size(max = 30) String tagLabel,
            @NotNull @Size(min = 1, max = 8)
            List<@NotBlank @Pattern(regexp = IMAGE_PATH, message = "Upload the photo instead of linking it") String> images,
            @NotNull @Size(max = 20) List<@Valid SpecDto> specs,
            @NotNull @Size(max = 30) List<@Valid VariantInput> variants,
            boolean advertised,
            Product.AdPlacement adPlacement,
            @Size(max = 80) String adHeadline,
            @Size(max = 40) String adHighlight,
            @Size(max = 200) String adCopy,
            @Pattern(regexp = IMAGE_PATH, message = "Upload the banner instead of linking it") String adImage) {
    }
}
