package in.rks.academy.player;

import in.rks.academy.common.FileStorageService;
import in.rks.academy.common.PageResponse;
import in.rks.academy.player.PlayerDtos.FeeStatus;
import in.rks.academy.player.PlayerDtos.PhotoResponse;
import in.rks.academy.player.PlayerDtos.PlayerAttendance;
import in.rks.academy.player.PlayerDtos.PlayerDetail;
import in.rks.academy.player.PlayerDtos.PlayerRequest;
import in.rks.academy.player.PlayerDtos.PlayerSummary;
import in.rks.academy.player.PlayerDtos.ProgressDto;
import in.rks.academy.player.PlayerDtos.SkillsRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Duration;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Players")
@Validated
@RestController
@RequestMapping("/api/v1")
public class PlayerController {

    private final PlayerService players;
    private final FileStorageService files;

    public PlayerController(PlayerService players, FileStorageService files) {
        this.players = players;
        this.files = files;
    }

    @Operation(summary = "Search and filter players. q matches name or code (e.g. RKS105).")
    @GetMapping("/players")
    public PageResponse<PlayerSummary> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Long courtId,
            @RequestParam(required = false) Level level,
            @RequestParam(required = false) FeeStatus feeStatus,
            @RequestParam(defaultValue = "true") boolean active,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "30") @Min(1) @Max(100) int size) {
        return players.search(new PlayerService.Filter(q, batchId, courtId, level, feeStatus, active), page, size);
    }

    @GetMapping("/players/{id}")
    public PlayerDetail get(@PathVariable long id) {
        return players.get(id);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/players")
    @ResponseStatus(HttpStatus.CREATED)
    public PlayerDetail create(@Valid @RequestBody PlayerRequest req) {
        return players.create(req);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/players/{id}")
    public PlayerDetail update(@PathVariable long id, @Valid @RequestBody PlayerRequest req) {
        return players.update(id, req);
    }

    @Operation(summary = "Deactivate a player. Payments and attendance history are kept.")
    @PreAuthorize("hasRole('OWNER')")
    @DeleteMapping("/players/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable long id) {
        players.deactivate(id);
    }

    @Operation(summary = "Upload a photo (JPG, PNG or WebP, up to 2 MB)")
    @PreAuthorize("hasRole('OWNER')")
    @PostMapping(value = "/players/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PhotoResponse uploadPhoto(@PathVariable long id, @RequestPart("file") MultipartFile file) {
        return new PhotoResponse(players.updatePhoto(id, file));
    }

    @PreAuthorize("hasRole('OWNER')")
    @DeleteMapping("/players/{id}/photo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePhoto(@PathVariable long id) {
        players.removePhoto(id);
    }

    /** Uploaded images. Names are random and never reused, so they can be cached for a long time. */
    @GetMapping("/files/{folder:players|products}/{name}")
    public ResponseEntity<byte[]> file(@PathVariable String folder, @PathVariable String name) {
        FileStorageService.Kind kind = folder.equals("players")
                ? FileStorageService.Kind.PLAYER_PHOTO : FileStorageService.Kind.PRODUCT_IMAGE;
        FileStorageService.StoredFile file = files.load(kind, name);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .body(file.data());
    }

    @Operation(summary = "Attendance for the heatmap. Defaults to the last 14 weeks.")
    @GetMapping("/players/{id}/attendance")
    public PlayerAttendance attendance(
            @PathVariable long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return players.attendance(id, from, to);
    }

    @Operation(summary = "Level history and skill scores")
    @GetMapping("/players/{id}/progress")
    public ProgressDto progress(@PathVariable long id) {
        return players.progress(id);
    }

    @Operation(summary = "Update skill scores (0 to 100). Coaches can do this too.")
    @PutMapping("/players/{id}/skills")
    public ProgressDto updateSkills(@PathVariable long id, @Valid @RequestBody SkillsRequest req) {
        return players.updateSkills(id, req.scores());
    }
}
