package in.rks.academy.notification;

import in.rks.academy.config.AppProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lets the owner confirm the WhatsApp setup works before the 1st of the month, with one test message. */
@Tag(name = "Fee reminders")
@RestController
@RequestMapping("/api/v1/notifications/whatsapp")
@PreAuthorize("hasRole('OWNER')")
public class WhatsAppSetupController {

    public record Status(String provider, boolean live, String templateName, String templateLanguage,
                         List<String> issues) {
    }

    public record TestRequest(
            @NotBlank @Pattern(regexp = "\\d{10}", message = "Enter a 10-digit mobile number") String mobile) {
    }

    public record TestResult(boolean ok, String provider, String messageId, String error, String preview) {
    }

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final WhatsAppSender sender;
    private final AppProperties props;
    private final Clock clock;

    public WhatsAppSetupController(WhatsAppSender sender, AppProperties props, Clock clock) {
        this.sender = sender;
        this.props = props;
        this.clock = clock;
    }

    @GetMapping
    public Status status() {
        AppProperties.WhatsApp.Cloud cloud = props.whatsapp().cloud();
        List<String> issues = new ArrayList<>();
        boolean live = "cloud".equals(sender.name());
        if (!live) {
            issues.add("Reminders are recorded but not sent. Set APP_WHATSAPP_PROVIDER=cloud to send them.");
        }
        if (!props.reminders().enabled()) {
            issues.add("Month-start reminders are switched off (APP_REMINDERS_ENABLED=false).");
        }
        return new Status(sender.name(), live, cloud.templateName(), cloud.templateLanguage(), issues);
    }

    @Operation(summary = "Send one sample fee reminder to a number, using the real template")
    @PostMapping("/test")
    public TestResult test(@Valid @RequestBody TestRequest req) {
        LocalDate monthStart = LocalDate.now(clock).withDayOfMonth(1);
        List<String> params = List.of("Parent", "Sample Player", "RKS000", "Monthly", monthStart.format(MONTH),
                "₹1,500", monthStart.withDayOfMonth(10).format(DAY));
        String text = FeeReminderService.message(params);
        WhatsAppSender.Result result = sender.send(new WhatsAppSender.Message("91" + req.mobile(),
                props.whatsapp().cloud().templateName(), text, params, null));
        return new TestResult(result.ok(), sender.name(), result.messageId(), result.error(), text);
    }
}
