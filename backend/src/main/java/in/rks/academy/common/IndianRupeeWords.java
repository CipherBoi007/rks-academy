package in.rks.academy.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Spells an INR amount in the Indian numbering system, e.g. 15000 becomes "Rupees Fifteen Thousand Only". */
public final class IndianRupeeWords {

    private static final String[] ONES = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
            "Nineteen"};
    private static final String[] TENS = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
            "Ninety"};

    private IndianRupeeWords() {
    }

    public static String of(BigDecimal amount) {
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        long rupees = scaled.longValue();
        int paise = scaled.remainder(BigDecimal.ONE).movePointRight(2).intValue();
        StringBuilder sb = new StringBuilder("Rupees ").append(rupees == 0 ? "Zero" : spell(rupees));
        if (paise > 0) {
            sb.append(" and ").append(spell(paise)).append(" Paise");
        }
        return sb.append(" Only").toString();
    }

    private static String spell(long n) {
        StringBuilder sb = new StringBuilder();
        n = chunk(sb, n, 10_000_000L, "Crore");
        n = chunk(sb, n, 100_000L, "Lakh");
        n = chunk(sb, n, 1_000L, "Thousand");
        n = chunk(sb, n, 100L, "Hundred");
        if (n > 0) {
            append(sb, belowHundred((int) n));
        }
        return sb.toString();
    }

    private static long chunk(StringBuilder sb, long n, long unit, String label) {
        if (n >= unit) {
            long count = n / unit;
            append(sb, (count >= 100 ? spell(count) : belowHundred((int) count)) + " " + label);
            n %= unit;
        }
        return n;
    }

    private static String belowHundred(int n) {
        if (n < 20) {
            return ONES[n];
        }
        return TENS[n / 10] + (n % 10 == 0 ? "" : " " + ONES[n % 10]);
    }

    private static void append(StringBuilder sb, String part) {
        if (!sb.isEmpty()) {
            sb.append(' ');
        }
        sb.append(part);
    }
}
