package in.rks.academy.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import in.rks.academy.billing.BillingPeriod;
import in.rks.academy.billing.BillingService;
import in.rks.academy.billing.FeePlan;
import in.rks.academy.billing.FeeQuote;
import in.rks.academy.billing.PolicyService;
import in.rks.academy.billing.PolicyTerms;
import in.rks.academy.config.AppProperties;
import in.rks.academy.player.Player;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class FeeReminderServiceTest {

    static final Clock NOV_1 = Clock.fixed(Instant.parse("2026-11-01T03:30:00Z"), ZoneId.of("Asia/Kolkata"));
    static final PolicyTerms POLICY = new PolicyTerms(new BigDecimal("1000"), BigDecimal.TEN, new BigDecimal("15"),
            10, new BigDecimal("100"), BigDecimal.TEN, new BigDecimal("300"), LocalDate.of(2000, 1, 1));

    BillingService billing = mock(BillingService.class);
    PolicyService policies = mock(PolicyService.class);
    FeeReminderRepository repo = mock(FeeReminderRepository.class);
    WhatsAppSender sender = mock(WhatsAppSender.class);
    FeeReminderService service;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties(null, "http://localhost", "910000000000", "",
                new AppProperties.WhatsApp("log", new AppProperties.WhatsApp.Cloud("", "", "", "fee_reminder", "en")),
                null, null);
        service = new FeeReminderService(billing, policies, repo, sender, props, NOV_1);
        when(policies.allTerms()).thenReturn(List.of(POLICY));
        when(sender.name()).thenReturn("test");
        when(repo.findByPlayerIdAndPeriodFrom(any(), any())).thenReturn(Optional.empty());
    }

    @Test
    void remindsOnlyPeriodsStartingThisMonthAndCountsFailures() {
        Due nov = due(1L, "Aravind Murugan", "RKS101", "9000000101", "2026-11-01", "2026-11-30", "1500");
        Due novToo = due(2L, "Kavya Ramesh", "RKS102", "9000000102", "2026-11-01", "2027-01-31", "4200");
        Due oct = due(3L, "Meenakshi Sundar", "RKS110", "9000000110", "2026-10-01", "2026-12-31", "4500");
        when(billing.dues()).thenReturn(List.of(nov.value, novToo.value, oct.value));
        when(sender.send(argThat(m -> m != null && m.toMobile().equals("919000000101"))))
                .thenReturn(WhatsAppSender.Result.sent("m1"));
        when(sender.send(argThat(m -> m != null && m.toMobile().equals("919000000102"))))
                .thenReturn(WhatsAppSender.Result.failed("down"));

        FeeReminderService.RunResult run = service.sendForCurrentMonth();

        assertThat(run.month()).isEqualTo("2026-11");
        assertThat(run.eligible()).isEqualTo(2);
        assertThat(run.sent()).isEqualTo(1);
        assertThat(run.failed()).isEqualTo(1);
        verify(sender, never()).send(argThat(m -> m != null && m.toMobile().equals("919000000110")));
    }

    @Test
    void alreadySentPeriodsAreSkipped() {
        Due nov = due(1L, "Aravind Murugan", "RKS101", "9000000101", "2026-11-01", "2026-11-30", "1500");
        FeeReminder done = new FeeReminder();
        done.setStatus(FeeReminder.Status.SENT);
        when(billing.dues()).thenReturn(List.of(nov.value));
        when(repo.findByPlayerIdAndPeriodFrom(1L, LocalDate.parse("2026-11-01"))).thenReturn(Optional.of(done));

        FeeReminderService.RunResult run = service.sendForCurrentMonth();

        assertThat(run.alreadySent()).isEqualTo(1);
        verify(sender, never()).send(any());
    }

    @Test
    void messageReadsNaturally() {
        String text = FeeReminderService.message(List.of("K. Murugan", "Aravind Murugan", "RKS101", "Monthly",
                "Nov 2026", "₹1,500", "10 Nov 2026"));
        assertThat(text).isEqualTo("Vanakkam K. Murugan! Fee reminder from RKS Academy for Aravind Murugan "
                + "(RKS101): Monthly plan for Nov 2026 is ₹1,500. Please pay by 10 Nov 2026 to avoid a late fee. "
                + "Thank you!");
        assertThat(FeeReminderService.rupees(new BigDecimal("15000.00"))).isEqualTo("₹15,000");
        assertThat(FeeReminderService.rupees(new BigDecimal("125000"))).isEqualTo("₹1,25,000");
    }

    record Due(BillingService.Due value) {
    }

    static Due due(long id, String name, String code, String mobile, String from, String to, String total) {
        FeePlan plan = new FeePlan();
        plan.setName("Monthly");
        Player p = new Player();
        ReflectionTestUtils.setField(p, "id", id);
        p.setName(name);
        p.setCode(code);
        p.setParentName("Parent of " + name);
        p.setParentMobile(mobile);
        p.setFeePlan(plan);
        BigDecimal amount = new BigDecimal(total);
        FeeQuote quote = new FeeQuote(new BillingPeriod(LocalDate.parse(from), LocalDate.parse(to)), amount, 1,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, amount);
        return new Due(new BillingService.Due(p, quote, 0));
    }
}
