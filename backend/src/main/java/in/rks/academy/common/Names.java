package in.rks.academy.common;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

public final class Names {

    private Names() {
    }

    /** "Aravind Murugan" becomes "AM", and "R. Sethupathi" becomes "RS". */
    public static String initials(String name) {
        String letters = Arrays.stream(name.trim().split("[\\s.]+"))
                .filter(s -> !s.isBlank())
                .map(s -> s.substring(0, 1))
                .collect(Collectors.joining());
        if (letters.length() > 2) {
            letters = letters.charAt(0) + letters.substring(letters.length() - 1);
        }
        return letters.toUpperCase(Locale.ROOT);
    }
}
