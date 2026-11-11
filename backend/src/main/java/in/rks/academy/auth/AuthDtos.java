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
            @NotBlank @Pattern(regexp = "\\d{4,6}", message = "PIN is 4 to 6 digits") String pin) {
    }

    public record ChangePinRequest(
            @NotBlank String currentPin,
            @NotBlank @Pattern(regexp = "\\d{4,6}", message = "PIN is 4 to 6 digits") String newPin) {
    }

    public record UserDto(long id, String name, String displayName, AdminUser.Role role, String initials) {

        public static UserDto of(AdminUser u) {
            return new UserDto(u.getId(), u.getName(), u.displayName(), u.getRole(), Names.initials(u.getName()));
        }
    }

    public record LoginResponse(String token, Instant expiresAt, boolean mustChangePin, UserDto user) {
    }
}
