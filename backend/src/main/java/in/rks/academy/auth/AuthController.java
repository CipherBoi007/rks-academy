package in.rks.academy.auth;

import in.rks.academy.auth.AuthDtos.ChangePinRequest;
import in.rks.academy.auth.AuthDtos.LoginRequest;
import in.rks.academy.auth.AuthDtos.LoginResponse;
import in.rks.academy.auth.AuthDtos.UserDto;
import in.rks.academy.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @Operation(summary = "Sign in with mobile number and PIN")
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.mobile(), req.pin());
    }

    @GetMapping("/me")
    public UserDto me() {
        return auth.me(CurrentUser.get().id());
    }

    @Operation(summary = "Change PIN; returns a fresh token. Required before anything else after first sign-in.")
    @PostMapping("/change-pin")
    public LoginResponse changePin(@Valid @RequestBody ChangePinRequest req) {
        return auth.changePin(CurrentUser.get().id(), req.currentPin(), req.newPin());
    }
}
