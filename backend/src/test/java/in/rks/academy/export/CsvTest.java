package in.rks.academy.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class CsvTest {

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource(delimiter = '|', quoteCharacter = '`', value = {
            "Aravind Murugan|Aravind Murugan",
            "12, Kenikarai|\"12, Kenikarai\"",
            "Say \"hi\"|\"Say \"\"hi\"\"\"",
            "=HYPERLINK(\"http://x\")|\"'=HYPERLINK(\"\"http://x\"\")\"",
            "+91 90000|'+91 90000",
            "-5+3|'-5+3",
            "@SUM(A1)|'@SUM(A1)"})
    void escapesAndNeutralisesFormulas(String in, String out) {
        assertThat(Csv.text(in)).isEqualTo(out);
    }

    @Test
    void numbersAndDatesAreWrittenRaw() {
        String csv = new String(new Csv()
                .row("Amount", "Adjustment", "Date")
                .row(new BigDecimal("1500.00"), new BigDecimal("-300.00"), LocalDate.of(2026, 11, 5))
                .bytes(), StandardCharsets.UTF_8);
        assertThat(csv).isEqualTo("﻿Amount,Adjustment,Date\r\n1500.00,-300.00,2026-11-05\r\n");
    }

    @Test
    void nullsAreEmptyCells() {
        String csv = new String(new Csv().row("a", null, "c").bytes(), StandardCharsets.UTF_8);
        assertThat(csv).isEqualTo("﻿a,,c\r\n");
    }
}
