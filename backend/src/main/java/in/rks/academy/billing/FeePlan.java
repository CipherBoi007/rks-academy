package in.rks.academy.billing;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "fee_plan")
public class FeePlan extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "level_label", nullable = false)
    private String levelLabel;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "period_months", nullable = false)
    private int periodMonths;

    @Column(name = "sessions_per_week", nullable = false)
    private int sessionsPerWeek;

    @ElementCollection
    @CollectionTable(name = "fee_plan_perk", joinColumns = @JoinColumn(name = "fee_plan_id"))
    @OrderColumn(name = "position")
    @Column(name = "text", nullable = false)
    private List<String> perks = new ArrayList<>();

    @Column(name = "most_popular", nullable = false)
    private boolean mostPopular;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;
}
