package in.rks.academy.auth;

import java.security.SecureRandom;

/** One-time 6-digit PINs for new or reset logins. The user must replace it at first sign-in. */
public final class TemporaryPin {

    private static final SecureRandom RANDOM = new SecureRandom();

    private TemporaryPin() {
    }

    public static String generate() {
        String pin;
        do {
            pin = String.format("%06d", RANDOM.nextInt(1_000_000));
        } while (PinPolicy.isWeak(pin));
        return pin;
    }
}
