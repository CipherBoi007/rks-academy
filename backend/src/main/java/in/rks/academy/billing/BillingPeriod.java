package in.rks.academy.billing;

import java.time.LocalDate;

public record BillingPeriod(LocalDate from, LocalDate to) {

    public boolean contains(LocalDate date) {
        return !date.isBefore(from) && !date.isAfter(to);
    }
}
