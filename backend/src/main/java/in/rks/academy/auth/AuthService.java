package in.rks.academy.auth;

import in.rks.academy.admin.AdminUser;
import in.rks.academy.admin.AdminUserRepository;
import in.rks.academy.auth.AuthDtos.LoginResponse;
import in.rks.academy.auth.AuthDtos.UserDto;
import in.rks.academy.common.ApiException;
import in.rks.academy.security.JwtService;
import in.rks.academy.security.LoginAttemptLimiter;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final ApiException BAD_CREDENTIALS =
            new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Mobile number or PIN is incorrect");

    private final AdminUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final LoginAttemptLimiter limiter;

    public AuthService(AdminUserRepository users, PasswordEncoder encoder, JwtService jwt,
                       LoginAttemptLimiter limiter) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.limiter = limiter;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(String mobile, String pin) {
        if (limiter.isLocked(mobile)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "LOCKED",
                    "Too many wrong PINs. Try again in 5 minutes.");
        }
        AdminUser user = users.findByMobile(mobile).filter(AdminUser::isActive).orElse(null);
        if (user == null || !encoder.matches(pin, user.getPinHash())) {
            limiter.recordFailure(mobile);
            throw BAD_CREDENTIALS;
        }
        limiter.recordSuccess(mobile);
        return respond(user);
    }

    @Transactional(readOnly = true)
    public UserDto me(long userId) {
        return UserDto.of(load(userId));
    }

    @Transactional
    public LoginResponse changePin(long userId, String currentPin, String newPin) {
        AdminUser user = load(userId);
        if (!encoder.matches(currentPin, user.getPinHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Current PIN is incorrect");
        }
        if (currentPin.equals(newPin)) {
            throw ApiException.rule("PIN_UNCHANGED", "Choose a PIN different from the current one");
        }
        if (PinPolicy.isWeak(newPin)) {
            throw ApiException.rule("PIN_TOO_WEAK", "Avoid repeated or sequential digits like 1111 or 1234");
        }
        user.setPinHash(encoder.encode(newPin));
        user.setMustChangePin(false);
        user.revokeSessions(); // other devices signed in with the old PIN are signed out
        return respond(user);
    }

    private AdminUser load(long userId) {
        return users.findById(userId).filter(AdminUser::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Please sign in"));
    }

    private LoginResponse respond(AdminUser user) {
        JwtService.IssuedToken token = jwt.issue(user);
        return new LoginResponse(token.token(), token.expiresAt(), user.isMustChangePin(), UserDto.of(user));
    }
}
