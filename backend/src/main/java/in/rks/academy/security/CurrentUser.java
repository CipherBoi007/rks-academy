package in.rks.academy.security;

import in.rks.academy.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static AuthUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // Family principals are a different type, so a parent can never pass as staff here.
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Please sign in");
        }
        return user;
    }

    /** Coaches never see fee amounts; services use this to null out money fields. */
    public static boolean canSeeFees() {
        return get().isOwner();
    }
}
