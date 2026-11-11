package in.rks.academy.security;

import in.rks.academy.admin.AdminUser;

/** The authenticated principal, loaded from the database on every request. */
public record AuthUser(long id, String name, AdminUser.Role role, boolean pinChangeRequired) {

    public boolean isOwner() {
        return role == AdminUser.Role.OWNER;
    }
}
