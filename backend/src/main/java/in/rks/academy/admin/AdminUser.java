package in.rks.academy.admin;

import in.rks.academy.coach.Coach;
import in.rks.academy.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "admin_user")
public class AdminUser extends BaseEntity {

    public enum Role { OWNER, COACH }

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String mobile;

    @Column(name = "pin_hash", nullable = false)
    private String pinHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coach_id")
    private Coach coach;

    @Column(name = "must_change_pin", nullable = false)
    private boolean mustChangePin;

    @Column(nullable = false)
    private boolean active = true;

    /** Bumped whenever existing sessions must stop working (PIN change or reset, role change, deactivation). */
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    public void revokeSessions() {
        tokenVersion++;
    }

    /** How the top bar greets this user: "Coach R. Sethupathi" when the login belongs to a coach. */
    public String displayName() {
        return coach != null ? "Coach " + name : name;
    }
}
