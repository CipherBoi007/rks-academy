package in.rks.academy.security;

import in.rks.academy.admin.AdminUser;
import in.rks.academy.admin.AdminUserRepository;
import in.rks.academy.family.FamilyPrincipal;
import in.rks.academy.family.FamilyAccountRepository;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.JwtService.TokenClaims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates a bearer token, then re-reads its subject so that access comes from the database, not the token.
 * <ul>
 *   <li>Staff: role, active status and a pending PIN change come from {@code admin_user}. A token from before a
 *       PIN change, PIN reset or deactivation stops working because its session version no longer matches.</li>
 *   <li>Family: the account must still have at least one active player on file with their mobile number.</li>
 * </ul>
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    /** Granted instead of a role while a forced PIN change is pending, so only the PIN-change endpoints work. */
    public static final String PIN_CHANGE_AUTHORITY = "PIN_CHANGE_REQUIRED";
    public static final String FAMILY_ROLE = "ROLE_FAMILY";

    private final JwtService jwtService;
    private final AdminUserRepository users;
    private final FamilyAccountRepository parents;
    private final PlayerRepository players;

    public JwtAuthFilter(JwtService jwtService, AdminUserRepository users, FamilyAccountRepository parents,
                         PlayerRepository players) {
        this.jwtService = jwtService;
        this.users = users;
        this.parents = parents;
        this.players = players;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwtService.parse(header.substring(7)).ifPresent(claims -> {
                if (claims.family()) {
                    authenticateFamily(claims);
                } else {
                    authenticateStaff(claims);
                }
            });
        }
        chain.doFilter(request, response);
    }

    private void authenticateStaff(TokenClaims claims) {
        users.findWithCoachById(claims.subjectId())
                .filter(AdminUser::isActive)
                .filter(u -> u.getTokenVersion() == claims.tokenVersion())
                .ifPresent(u -> {
                    AuthUser user = new AuthUser(u.getId(), u.displayName(), u.getRole(), u.isMustChangePin());
                    String authority = user.pinChangeRequired() ? PIN_CHANGE_AUTHORITY : "ROLE_" + user.role().name();
                    setAuthentication(user, authority);
                });
    }

    private void authenticateFamily(TokenClaims claims) {
        parents.findById(claims.subjectId())
                .filter(p -> p.getTokenVersion() == claims.tokenVersion())
                .filter(p -> players.existsByContactMobileAndActiveTrue(p.getMobile()))
                .ifPresent(p -> setAuthentication(new FamilyPrincipal(p.getId(), p.getMobile()), FAMILY_ROLE));
    }

    private static void setAuthentication(Object principal, String authority) {
        var auth = new UsernamePasswordAuthenticationToken(principal, null,
                List.of(new SimpleGrantedAuthority(authority)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
