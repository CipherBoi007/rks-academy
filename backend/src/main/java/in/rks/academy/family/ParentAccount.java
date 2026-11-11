package in.rks.academy.family;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** A parent who has signed in to the family portal. Their children are the active players with this mobile. */
@Getter
@Setter
@Entity
@Table(name = "parent_account")
public class ParentAccount extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String mobile;

    /** Bumped to sign the parent out on every device. */
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;
}
