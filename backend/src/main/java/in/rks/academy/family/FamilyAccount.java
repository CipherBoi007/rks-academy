package in.rks.academy.family;

import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * A family-app sign-in, created when the owner first issues a PIN. It belongs to a mobile number: its players are
 * the active players with that contact number, whether a parent's children, an adult player, or both.
 */
@Getter
@Setter
@Entity
@Table(name = "family_account")
public class FamilyAccount extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String mobile;

    /** bcrypt hash of the PIN; null until the owner issues one. */
    @Column(name = "pin_hash")
    private String pinHash;

    /** True while the PIN is a one-time PIN from the owner; it opens nothing until it is replaced. */
    @Column(name = "must_change_pin", nullable = false)
    private boolean mustChangePin = true;

    /** Bumped to sign the account out on every device. */
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;
}
