package in.rks.academy.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        @NotBlank String frontendOrigin,
        @Pattern(regexp = "\\d{10,15}", message = "must be digits with country code, e.g. 910000000000")
        String whatsappNumber,
        /* Shared secret the web app sends on every API call; empty turns the check off. See ProxyKeyFilter. */
        String proxyKey,
        WhatsApp whatsapp,
        Reminders reminders,
        Academy academy) {

    /** ttl: staff sessions. familyTtl: family sessions, longer because parents use the portal on their own phones. */
    public record Jwt(
            @NotBlank @Size(min = 32, message = "must be at least 32 characters") String secret,
            Duration ttl,
            Duration familyTtl) {
    }

    /** provider: "log" (records only, the default) or "cloud" (WhatsApp Business Cloud API). */
    public record WhatsApp(String provider, Cloud cloud) {
        /** templateName: the fee reminder template. */
        public record Cloud(String apiUrl, String phoneNumberId, String accessToken, String templateName,
                            String templateLanguage) {
        }
    }

    public record Reminders(boolean enabled, String cron) {
    }

    public record Academy(String name, String shortName, String address, String phone) {
    }
}
