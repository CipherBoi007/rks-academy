package in.rks.academy.family;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * A parent's sign-in to the family portal, created when the owner first issues them a PIN. Their children are the
 * active players with this mobile number.
 */
@Getter
@Setter
@Entity
@Table(name = "parent_account")
public class ParentAccount extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String mobile;

    /** Bumped to sign the parent out on every device. */
    /** bcrypt hash of the parent's PIN; null until the owner issues one. */
    @Column(name = "pin_hash")
    private String pinHash;

    /** True while the PIN is a one-time PIN from the owner; it opens nothing until the parent replaces it. */
    @Column(name = "must_change_pin", nullable = false)
    private boolean mustChangePin = true;

    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;
}
