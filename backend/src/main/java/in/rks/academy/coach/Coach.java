package in.rks.academy.coach;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "coach")
public class Coach extends BaseEntity {

    @Column(nullable = false)
    private String name;

    /** e.g. "Junior Coach", shown under the coach's name on a player profile. */
    private String title;

    private String mobile;

    @Column(nullable = false)
    private boolean active = true;
}
