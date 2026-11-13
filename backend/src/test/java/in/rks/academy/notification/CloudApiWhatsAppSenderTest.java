package in.rks.academy.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import in.rks.academy.config.AppProperties;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * Contract test against the WhatsApp Business Cloud API's documented message format: a template message to
 * POST /{phone-number-id}/messages with a bearer token. A live send needs real Meta credentials.
 */
class CloudApiWhatsAppSenderTest {

    static final AppProperties.WhatsApp.Cloud CONFIG = new AppProperties.WhatsApp.Cloud(
            "https://graph.facebook.com/v21.0", "1234567890", "test-token", "fee_reminder", "en");

    MockRestServiceServer server;
    CloudApiWhatsAppSender sender;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(CONFIG.apiUrl())
                .defaultHeader("Authorization", "Bearer " + CONFIG.accessToken());
        server = MockRestServiceServer.bindTo(builder).build();
        sender = new CloudApiWhatsAppSender(CONFIG, builder.build());
    }

    @Test
    void sendsTheApprovedTemplateWithParametersInOrder() {
        server.expect(requestTo("https://graph.facebook.com/v21.0/1234567890/messages"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-token"))
                .andExpect(content().json("""
                        {
                          "messaging_product": "whatsapp",
                          "to": "919000000101",
                          "type": "template",
                          "template": {
                            "name": "fee_reminder",
                            "language": {"code": "en"},
                            "components": [{
                              "type": "body",
                              "parameters": [
                                {"type": "text", "text": "K. Murugan"},
                                {"type": "text", "text": "Aravind Murugan"},
                                {"type": "text", "text": "RKS101"},
                                {"type": "text", "text": "Monthly"},
                                {"type": "text", "text": "Dec 2026"},
                                {"type": "text", "text": "₹1,500"},
                                {"type": "text", "text": "10 Dec 2026"}
                              ]
                            }]
                          }
                        }""", JsonCompareMode.STRICT))
                .andRespond(withSuccess("""
                        {"messaging_product":"whatsapp","contacts":[{"input":"919000000101","wa_id":"919000000101"}],
                         "messages":[{"id":"wamid.HBgM"}]}""", MediaType.APPLICATION_JSON));

        WhatsAppSender.Result result = sender.send(new WhatsAppSender.Message("919000000101", "fee_reminder",
                "ignored by the API",
                List.of("K. Murugan", "Aravind Murugan", "RKS101", "Monthly", "Dec 2026", "₹1,500", "10 Dec 2026")));

        server.verify();
        assertThat(result.ok()).isTrue();
        assertThat(result.messageId()).isEqualTo("wamid.HBgM");
    }

    @Test
    void reportsMetasReasonWithoutLeakingTheToken() {
        server.expect(requestTo("https://graph.facebook.com/v21.0/1234567890/messages"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON).body("""
                        {"error":{"message":"Recipient phone number not in allowed list","type":"OAuthException",
                         "code":131030,"fbtrace_id":"A1"}}"""));

        WhatsAppSender.Result result = sender.send(message());

        assertThat(result.ok()).isFalse();
        assertThat(result.error()).isEqualTo("WhatsApp API 400: (#131030) Recipient phone number not in allowed list");
        assertThat(result.error()).doesNotContain("test-token");
    }

    @Test
    void serverErrorsBecomeFailedResults() {
        server.expect(requestTo("https://graph.facebook.com/v21.0/1234567890/messages"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        WhatsAppSender.Result result = sender.send(message());

        assertThat(result.ok()).isFalse();
        assertThat(result.error()).isEqualTo("WhatsApp API 503");
    }

    static WhatsAppSender.Message message() {
        return new WhatsAppSender.Message("919000000101", "fee_reminder", "x", List.of("a"));
    }

    @Test
    void refusesToStartWithoutCredentials() {
        var missing = new AppProperties.WhatsApp.Cloud("https://graph.facebook.com/v21.0", "", "", "t", "en");
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> CloudApiWhatsAppSender.clientFor(missing, RestClient.builder()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_WHATSAPP_ACCESS_TOKEN");
    }
}
