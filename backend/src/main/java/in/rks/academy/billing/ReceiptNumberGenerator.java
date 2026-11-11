package in.rks.academy.billing;

import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Issues RKS/{yy}/{nnnn} numbers from a per-year counter; the UPDATE ... RETURNING row lock makes it gap-safe. */
@Component
public class ReceiptNumberGenerator {

    private final JdbcTemplate jdbc;

    public ReceiptNumberGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String next(LocalDate issuedOn) {
        String yy = String.format("%02d", issuedOn.getYear() % 100);
        jdbc.update("INSERT INTO receipt_sequence (year_suffix, next_value) VALUES (?, 1) ON CONFLICT DO NOTHING", yy);
        Integer n = jdbc.queryForObject(
                "UPDATE receipt_sequence SET next_value = next_value + 1 WHERE year_suffix = ? RETURNING next_value - 1",
                Integer.class, yy);
        return String.format("RKS/%s/%04d", yy, n);
    }
}
