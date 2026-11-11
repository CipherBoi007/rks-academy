package in.rks.academy.court;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "court")
public class Court extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "surface_type", nullable = false)
    private String surfaceType;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;
}
