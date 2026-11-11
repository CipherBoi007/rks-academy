package in.rks.academy.facility;

import in.rks.academy.batch.BatchDto;
import in.rks.academy.facility.FacilityService.BatchRequest;
import in.rks.academy.facility.FacilityService.CoachDto;
import in.rks.academy.facility.FacilityService.CoachRequest;
import in.rks.academy.facility.FacilityService.CourtDto;
import in.rks.academy.facility.FacilityService.CourtRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Courts, coaches & batches")
@RestController
@RequestMapping("/api/v1")
public class FacilityController {

    private final FacilityService facilities;

    public FacilityController(FacilityService facilities) {
        this.facilities = facilities;
    }

    @GetMapping("/courts")
    public List<CourtDto> courts(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return facilities.courts(includeInactive);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/courts")
    @ResponseStatus(HttpStatus.CREATED)
    public CourtDto createCourt(@Valid @RequestBody CourtRequest req) {
        return facilities.createCourt(req);
    }

    @Operation(summary = "Edit a court, or turn it off (refused while it has active batches)")
    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/courts/{id}")
    public CourtDto updateCourt(@PathVariable long id, @Valid @RequestBody CourtRequest req) {
        return facilities.updateCourt(id, req);
    }

    @GetMapping("/coaches")
    public List<CoachDto> coaches(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return facilities.coaches(includeInactive);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/coaches")
    @ResponseStatus(HttpStatus.CREATED)
    public CoachDto createCoach(@Valid @RequestBody CoachRequest req) {
        return facilities.createCoach(req);
    }

    @Operation(summary = "Edit a coach, or turn them off (refused while they lead active batches)")
    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/coaches/{id}")
    public CoachDto updateCoach(@PathVariable long id, @Valid @RequestBody CoachRequest req) {
        return facilities.updateCoach(id, req);
    }

    @Operation(summary = "Batches, optionally for one court and only those running on a given date")
    @GetMapping("/batches")
    public List<BatchDto> batches(
            @RequestParam(required = false) Long courtId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return facilities.batches(courtId, date, includeInactive);
    }

    @Operation(summary = "Create a batch. Refused if the court is already booked at that time.")
    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/batches")
    @ResponseStatus(HttpStatus.CREATED)
    public BatchDto createBatch(@Valid @RequestBody BatchRequest req) {
        return facilities.createBatch(req);
    }

    @Operation(summary = "Edit a batch, or turn it off (refused while it has active players)")
    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/batches/{id}")
    public BatchDto updateBatch(@PathVariable long id, @Valid @RequestBody BatchRequest req) {
        return facilities.updateBatch(id, req);
    }
}
