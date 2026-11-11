package in.rks.academy.auth;

import in.rks.academy.admin.AdminUser;
import in.rks.academy.common.Names;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank @Pattern(regexp = "\\d{10}", message = "Enter a 10-digit mobile number") String mobile,
            // 4 and 5 digits are still accepted so PINs set before the 6-digit minimum can sign in once (and must
            // then be changed; see AuthService.login).
            @NotBlank @Pattern(regexp = "\\d{4,12}", message = "Enter your PIN") String pin) {
    }

    public record ChangePinRequest(
            @NotBlank String currentPin,
            @NotBlank @Pattern(regexp = "\\d{6,12}", message = "PIN is 6 to 12 digits") String newPin) {
    }

    public record UserDto(long id, String name, String displayName, AdminUser.Role role, String initials) {

        public static UserDto of(AdminUser u) {
            return new UserDto(u.getId(), u.getName(), u.displayName(), u.getRole(), Names.initials(u.getName()));
        }
    }

    public record LoginResponse(String token, Instant expiresAt, boolean mustChangePin, UserDto user) {
    }
}
