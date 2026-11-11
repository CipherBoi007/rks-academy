package in.rks.academy.admin;

import in.rks.academy.admin.StaffService.CreateStaff;
import in.rks.academy.admin.StaffService.StaffDto;
import in.rks.academy.admin.StaffService.StaffWithPin;
import in.rks.academy.admin.StaffService.UpdateStaff;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Staff logins")
@RestController
@RequestMapping("/api/v1/staff")
@PreAuthorize("hasRole('OWNER')")
public class StaffController {

    private final StaffService staff;

    public StaffController(StaffService staff) {
        this.staff = staff;
    }

    @GetMapping
    public List<StaffDto> list() {
        return staff.list();
    }

    @Operation(summary = "Create a login. The response holds a one-time PIN, shown once and never stored.")
    @PostMapping
    public ResponseEntity<StaffWithPin> create(@Valid @RequestBody CreateStaff req) {
        return noStore(HttpStatus.CREATED, staff.create(req));
    }

    @Operation(summary = "Rename, change role, link a coach, or turn a login on or off")
    @PutMapping("/{id}")
    public StaffDto update(@PathVariable long id, @Valid @RequestBody UpdateStaff req) {
        return staff.update(id, req);
    }

    @Operation(summary = "Issue a new one-time PIN and sign the user out everywhere")
    @PostMapping("/{id}/reset-pin")
    public ResponseEntity<StaffWithPin> resetPin(@PathVariable long id) {
        return noStore(HttpStatus.OK, staff.resetPin(id));
    }

    /** One-time PINs must never sit in a browser or proxy cache. */
    private static ResponseEntity<StaffWithPin> noStore(HttpStatus status, StaffWithPin body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
