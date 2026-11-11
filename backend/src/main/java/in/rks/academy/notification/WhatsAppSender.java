package in.rks.academy.notification;

import java.util.List;

/** Sends one business-initiated WhatsApp message. Implementations never throw; failures come back as a result. */
public interface WhatsAppSender {

    /**
     * @param toMobile    digits with country code, e.g. 919000000101
     * @param template    the approved template's name
     * @param text        the message as it reads (used by the log provider and stored for the record)
     * @param bodyParams  template body parameters, in order
     * @param buttonParam for authentication templates: the code behind the "Copy code" button; otherwise null
     */
    record Message(String toMobile, String template, String text, List<String> bodyParams, String buttonParam) {
    }

    Result send(Message message);

    String name();

    record Result(boolean ok, String messageId, String error) {

        public static Result sent(String messageId) {
            return new Result(true, messageId, null);
        }

        public static Result failed(String error) {
            return new Result(false, null, error);
        }
    }
}
