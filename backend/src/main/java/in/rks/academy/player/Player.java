package in.rks.academy.player;

import in.rks.academy.batch.Batch;
import in.rks.academy.billing.FeePlan;
import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.Period;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "player")
public class Player extends BaseEntity {

    public enum Gender { MALE, FEMALE, OTHER }

    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "parent_name", nullable = false)
    private String parentName;

    @Column(name = "parent_mobile", nullable = false)
    private String parentMobile;

    @Column(name = "parent_occupation")
    private String parentOccupation;

    @Column(name = "blood_group")
    private String bloodGroup;

    private String school;

    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Level level;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fee_plan_id")
    private FeePlan feePlan;

    @Column(name = "join_date", nullable = false)
    private LocalDate joinDate;

    /** Always the 1st of a month: billing periods for the current plan repeat from here. */
    @Column(name = "plan_start_date", nullable = false)
    private LocalDate planStartDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sibling_group_id")
    private UUID siblingGroupId;

    public int ageOn(LocalDate date) {
        return Period.between(dob, date).getYears();
    }
}
