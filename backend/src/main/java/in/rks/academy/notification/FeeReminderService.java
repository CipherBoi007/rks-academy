package in.rks.academy.notification;

import in.rks.academy.billing.BillingService;
import in.rks.academy.billing.BillingService.Due;
import in.rks.academy.billing.FeeQuote;
import in.rks.academy.billing.FeeRules;
import in.rks.academy.billing.PolicyService;
import in.rks.academy.common.PageResponse;
import in.rks.academy.common.Refs.PlayerRef;
import in.rks.academy.config.AppProperties;
import in.rks.academy.player.Player;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Month-start WhatsApp fee reminders to the contacts (parent, guardian or the adult player) of players whose new billing period starts this month and
 * isn't paid yet. Players paid in advance, or mid-way through a quarterly or annual period, get nothing.
 * Each player is reminded at most once per period, so running it again only retries failed sends.
 */
@Service
public class FeeReminderService {

    public record RunResult(String month, int eligible, int sent, int failed, int alreadySent) {
    }

    public record ReminderDto(long id, PlayerRef player, LocalDate periodFrom, String toMobile, BigDecimal amount,
                              String message, FeeReminder.Status status, String provider, String error,
                              int attempts, OffsetDateTime sentAt) {
    }

    /**
     * sent/failed are the stored outcomes (a run happened if either is non-zero). delivered counts only reminders
     * Meta accepted; undelivered is everything else, including ones the log provider merely recorded.
     */
    public record MonthStatus(String month, long sent, long failed, long delivered, long undelivered) {
    }

    private static final Logger log = LoggerFactory.getLogger(FeeReminderService.class);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
    private static final String INDIA = "91";

    private final BillingService billing;
    private final PolicyService policies;
    private final FeeReminderRepository reminders;
    private final WhatsAppSender sender;
    private final String templateName;
    private final Clock clock;

    public FeeReminderService(BillingService billing, PolicyService policies, FeeReminderRepository reminders,
                              WhatsAppSender sender, AppProperties props, Clock clock) {
        this.billing = billing;
        this.policies = policies;
        this.reminders = reminders;
        this.sender = sender;
        this.templateName = props.whatsapp().cloud().templateName();
        this.clock = clock;
    }

    /** Sends this month's reminders. Each send is saved on its own, so one failure never blocks the rest. */
    public RunResult sendForCurrentMonth() {
        LocalDate monthStart = FeeRules.firstOfMonth(LocalDate.now(clock));
        List<Due> eligible = billing.dues().stream()
                .filter(d -> d.quote().period().from().equals(monthStart))
                .toList();
        int sent = 0;
        int failed = 0;
        int already = 0;
        for (Due due : eligible) {
            switch (remind(due)) {
                case SENT -> sent++;
                case FAILED -> failed++;
                case ALREADY_SENT -> already++;
            }
        }
        String month = YearMonth.from(monthStart).toString();
        log.info("Fee reminders for {}: {} eligible, {} sent, {} failed, {} already sent",
                month, eligible.size(), sent, failed, already);
        return new RunResult(month, eligible.size(), sent, failed, already);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReminderDto> list(YearMonth month, boolean undeliveredOnly, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("updatedAt")));
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        return PageResponse.of(undeliveredOnly
                        ? reminders.findUndelivered(from, to, pageable)
                        : reminders.findByPeriodFromBetween(from, to, pageable),
                r -> new ReminderDto(r.getId(), PlayerRef.of(r.getPlayer()), r.getPeriodFrom(), r.getToMobile(),
                        r.getAmount(), r.getMessage(), r.getStatus(), r.getProvider(), r.getError(),
                        r.getAttempts(), r.getSentAt()));
    }

    @Transactional(readOnly = true)
    public MonthStatus status(YearMonth month) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        long sent = reminders.countByPeriodFromBetweenAndStatus(from, to, FeeReminder.Status.SENT);
        long failed = reminders.countByPeriodFromBetweenAndStatus(from, to, FeeReminder.Status.FAILED);
        long delivered = reminders.countDelivered(from, to);
        return new MonthStatus(month.toString(), sent, failed, delivered, sent + failed - delivered);
    }

    private enum Outcome { SENT, FAILED, ALREADY_SENT }

    private Outcome remind(Due due) {
        Player p = due.player();
        FeeQuote q = due.quote();
        FeeReminder record = reminders.findByPlayerIdAndPeriodFrom(p.getId(), q.period().from())
                .orElseGet(FeeReminder::new);
        // A reminder "sent" by the log provider was only recorded. Once WhatsApp is live it still has to go out.
        boolean onlyRecorded = "log".equals(record.getProvider()) && !"log".equals(sender.name());
        if (record.getStatus() == FeeReminder.Status.SENT && !onlyRecorded) {
            return Outcome.ALREADY_SENT;
        }
        int dueByDay = FeeRules.policyOn(policies.allTerms(), q.period().from()).lateFeeAfterDay();
        List<String> params = List.of(p.getContactName(), p.getName(), p.getCode(), p.getFeePlan().getName(),
                periodLabel(q), rupees(q.total()), q.period().from().withDayOfMonth(dueByDay).format(DAY));
        String text = message(params);
        String to = INDIA + p.getContactMobile();

        WhatsAppSender.Result result = sender.send(
                new WhatsAppSender.Message(to, templateName, text, params));

        record.setPlayer(p);
        record.setPeriodFrom(q.period().from());
        record.setToMobile(to);
        record.setAmount(q.total());
        record.setMessage(text);
        record.setProvider(sender.name());
        record.setAttempts(record.getAttempts() + 1);
        record.setStatus(result.ok() ? FeeReminder.Status.SENT : FeeReminder.Status.FAILED);
        record.setProviderMessageId(result.messageId());
        record.setError(result.error());
        record.setSentAt(result.ok() ? OffsetDateTime.now(clock) : null);
        reminders.save(record);
        return result.ok() ? Outcome.SENT : Outcome.FAILED;
    }

    /** The message body. The approved Cloud API template must read the same, with {{1}}..{{7}} placeholders. */
    static String message(List<String> p) {
        return "Vanakkam " + p.get(0) + "! Fee reminder from RKS Academy for " + p.get(1) + " (" + p.get(2) + "): "
                + p.get(3) + " plan for " + p.get(4) + " is " + p.get(5) + ". Please pay by " + p.get(6)
                + " to avoid a late fee. Thank you!";
    }

    private static String periodLabel(FeeQuote q) {
        String from = q.period().from().format(MONTH);
        return q.period().from().getMonth() == q.period().to().getMonth()
                && q.period().from().getYear() == q.period().to().getYear()
                ? from : from + " – " + q.period().to().format(MONTH);
    }

    /** "₹1,25,000" using Indian grouping (the JDK's en-IN format groups in thousands only). */
    static String rupees(BigDecimal amount) {
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        String whole = scaled.toBigInteger().toString();
        StringBuilder grouped = new StringBuilder();
        int len = whole.length();
        for (int i = 0; i < len; i++) {
            int fromEnd = len - i;
            grouped.append(whole.charAt(i));
            if (fromEnd > 1 && (fromEnd == 4 || (fromEnd > 4 && fromEnd % 2 == 0))) {
                grouped.append(',');
            }
        }
        int paise = scaled.remainder(BigDecimal.ONE).movePointRight(2).intValue();
        return "₹" + grouped + (paise == 0 ? "" : String.format(".%02d", paise));
    }
}
