package in.rks.academy.notification;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** The default provider: records messages in the log without contacting anyone. Safe for dev and demos. */
@Component
@ConditionalOnProperty(name = "app.whatsapp.provider", havingValue = "log", matchIfMissing = true)
public class LogWhatsAppSender implements WhatsAppSender {

    private static final Logger log = LoggerFactory.getLogger(LogWhatsAppSender.class);

    @Override
    public Result send(Message message) {
        log.info("[whatsapp:log] {} to {}: {}", message.template(), message.toMobile(), message.text());
        return Result.sent("log-" + UUID.randomUUID());
    }

    @Override
    public String name() {
        return "log";
    }
}
