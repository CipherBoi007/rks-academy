package in.rks.academy.auth;

import java.util.Set;

/** Rejects PINs that are trivially guessable. Only applies to PINs users choose themselves. */
public final class PinPolicy {

    private static final Set<String> COMMON = Set.of("1234", "12345", "123456", "4321", "654321", "1212", "2580");

    private PinPolicy() {
    }

    public static boolean isWeak(String pin) {
        if (COMMON.contains(pin) || pin.chars().distinct().count() == 1) {
            return true;
        }
        boolean ascending = true;
        boolean descending = true;
        for (int i = 1; i < pin.length(); i++) {
            int step = pin.charAt(i) - pin.charAt(i - 1);
            ascending &= step == 1;
            descending &= step == -1;
        }
        return ascending || descending;
    }
}
