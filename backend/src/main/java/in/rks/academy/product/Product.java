package in.rks.academy.product;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "product")
public class Product extends BaseEntity {

    public enum Category { RACKETS, SHUTTLECOCKS, SHOES, GRIPS, BAGS, JERSEYS }

    public enum AdPlacement { HERO, INLINE, STRIP }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Embeddable
    public static class Spec {
        @Column(nullable = false)
        private String label;
        @Column(nullable = false)
        private String value;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Embeddable
    public static class Variant {
        @Column(name = "group_name", nullable = false)
        private String groupName;
        @Column(nullable = false)
        private String value;
    }

    @Column(nullable = false)
    private String brand;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal mrp;

    @Column(precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "review_count", nullable = false)
    private int reviewCount;

    /** Units on hand; null means stock isn't tracked for this item. */
    private Integer stock;

    @Column(name = "tag_label")
    private String tagLabel;

    @Column(nullable = false)
    private boolean advertised;

    @Enumerated(EnumType.STRING)
    @Column(name = "ad_placement")
    private AdPlacement adPlacement;

    @Column(name = "ad_headline")
    private String adHeadline;

    @Column(name = "ad_highlight")
    private String adHighlight;

    @Column(name = "ad_copy")
    private String adCopy;

    /** Wide artwork for the hero banner; falls back to the first product image. */
    @Column(name = "ad_image")
    private String adImage;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @ElementCollection
    @CollectionTable(name = "product_image", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "position")
    @Column(name = "url", nullable = false)
    private List<String> images = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "product_spec", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "position")
    private List<Spec> specs = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "product_variant", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "position")
    private List<Variant> variants = new ArrayList<>();
}
