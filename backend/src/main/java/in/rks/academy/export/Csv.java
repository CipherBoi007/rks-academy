package in.rks.academy.export;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/**
 * A minimal RFC 4180 CSV builder for spreadsheet exports. Text cells are neutralised against formula injection
 * (a value like {@code =HYPERLINK(...)} typed into a name field must never execute in Excel), and the output
 * starts with a UTF-8 byte-order mark so Excel shows ₹ and Tamil names correctly.
 */
public final class Csv {

    private static final char BOM = '﻿';
    private final StringBuilder out = new StringBuilder().append(BOM);
    private boolean rowStarted;

    public Csv row(Object... cells) {
        for (Object cell : cells) {
            cell(cell);
        }
        return end();
    }

    public Csv cell(Object value) {
        if (rowStarted) {
            out.append(',');
        }
        rowStarted = true;
        if (value == null) {
            return this;
        }
        if (value instanceof BigDecimal n) {
            out.append(n.toPlainString());
        } else if (value instanceof Number || value instanceof LocalDate) {
            out.append(value);
        } else {
            out.append(text(value.toString()));
        }
        return this;
    }

    public Csv end() {
        out.append("\r\n");
        rowStarted = false;
        return this;
    }

    public byte[] bytes() {
        return out.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** Quotes when needed, and prefixes an apostrophe to anything a spreadsheet would treat as a formula. */
    static String text(String s) {
        String safe = !s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0 ? "'" + s : s;
        boolean quote = safe.indexOf(',') >= 0 || safe.indexOf('"') >= 0 || safe.indexOf('\n') >= 0
                || safe.indexOf('\r') >= 0 || !safe.equals(safe.strip());
        return quote ? '"' + safe.replace("\"", "\"\"") + '"' : safe;
    }
}
