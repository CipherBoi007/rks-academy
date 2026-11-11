package in.rks.academy.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.rks.academy.config.AppProperties;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Sends reminders through the WhatsApp Business Cloud API. Business-initiated messages must use a template
 * approved in Meta Business Manager; the configured template's body takes the parameters in the order
 * {@link FeeReminderService} builds them.
 */
@Component
@ConditionalOnProperty(name = "app.whatsapp.provider", havingValue = "cloud")
public class CloudApiWhatsAppSender implements WhatsAppSender {

    private static final Logger log = LoggerFactory.getLogger(CloudApiWhatsAppSender.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestClient client;
    private final AppProperties.WhatsApp.Cloud config;

    @Autowired
    public CloudApiWhatsAppSender(AppProperties props, RestClient.Builder builder) {
        this(props.whatsapp().cloud(), clientFor(props.whatsapp().cloud(), builder));
    }

    CloudApiWhatsAppSender(AppProperties.WhatsApp.Cloud config, RestClient client) {
        this.config = config;
        this.client = client;
    }

    static RestClient clientFor(AppProperties.WhatsApp.Cloud config, RestClient.Builder builder) {
        if (isBlank(config.phoneNumberId()) || isBlank(config.accessToken())) {
            throw new IllegalStateException(
                    "APP_WHATSAPP_PHONE_NUMBER_ID and APP_WHATSAPP_ACCESS_TOKEN are required when provider=cloud");
        }
        var timeouts = new SimpleClientHttpRequestFactory();
        timeouts.setConnectTimeout(5_000);
        timeouts.setReadTimeout(10_000);
        return builder.baseUrl(config.apiUrl()).requestFactory(timeouts)
                .defaultHeader("Authorization", "Bearer " + config.accessToken())
                .build();
    }

    @Override
    public Result send(Message message) {
        String toMobile = message.toMobile();
        List<Map<String, Object>> components = new ArrayList<>();
        components.add(Map.of("type", "body", "parameters", textParams(message.bodyParams())));
        if (message.buttonParam() != null) {
            // Authentication templates carry the code again behind their "Copy code" button.
            components.add(Map.of("type", "button", "sub_type", "url", "index", "0",
                    "parameters", textParams(List.of(message.buttonParam()))));
        }
        Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", toMobile,
                "type", "template",
                "template", Map.of(
                        "name", message.template(),
                        "language", Map.of("code", config.templateLanguage()),
                        "components", components));
        try {
            JsonNode res = client.post().uri("/{id}/messages", config.phoneNumberId())
                    .contentType(MediaType.APPLICATION_JSON).body(body)
                    .retrieve().body(JsonNode.class);
            String id = res == null ? null : res.path("messages").path(0).path("id").asText(null);
            return Result.sent(id);
        } catch (RestClientResponseException e) {
            log.warn("WhatsApp API rejected message to {}: {} {}", toMobile, e.getStatusCode(),
                    e.getResponseBodyAsString());
            return Result.failed(describe(e));
        } catch (RuntimeException e) {
            log.warn("WhatsApp API call failed for {}", toMobile, e);
            return Result.failed("Could not reach WhatsApp");
        }
    }

    @Override
    public String name() {
        return "cloud";
    }

    private static List<Map<String, String>> textParams(List<String> values) {
        return values.stream().map(v -> Map.of("type", "text", "text", v)).toList();
    }

    /** Meta's own explanation, e.g. "(#131030) Recipient phone number not in allowed list". Never the token. */
    static String describe(RestClientResponseException e) {
        String prefix = "WhatsApp API " + e.getStatusCode().value();
        try {
            JsonNode error = MAPPER.readTree(e.getResponseBodyAsString()).path("error");
            String message = error.path("message").asText("");
            int code = error.path("code").asInt(0);
            if (message.isBlank()) {
                return prefix;
            }
            String full = prefix + ": " + (code > 0 ? "(#" + code + ") " : "") + message;
            return full.length() > 290 ? full.substring(0, 290) : full; // fits the reminder log's error column
        } catch (Exception parseFailure) {
            return prefix;
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
