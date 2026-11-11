package in.rks.academy.config;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Config")
@RestController
@RequestMapping("/api/v1/config")
public class PublicConfigController {

    /** {@code today} is the business date in Asia/Kolkata (pinned in dev), so the UI never trusts the browser clock. */
    public record PublicConfig(String academyName, String shortName, String whatsappNumber, LocalDate today) {
    }

    private final AppProperties props;
    private final Clock clock;

    public PublicConfigController(AppProperties props, Clock clock) {
        this.props = props;
        this.clock = clock;
    }

    @GetMapping("/public")
    public PublicConfig publicConfig() {
        return new PublicConfig(props.academy().name(), props.academy().shortName(), props.whatsappNumber(),
                LocalDate.now(clock));
    }
}
