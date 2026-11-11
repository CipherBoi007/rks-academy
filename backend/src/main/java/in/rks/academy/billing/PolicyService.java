package in.rks.academy.billing;

import in.rks.academy.billing.BillingDtos.PolicyDto;
import in.rks.academy.billing.BillingDtos.PolicyRequest;
import in.rks.academy.billing.BillingDtos.PolicyView;
import in.rks.academy.common.ApiException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PolicyService {

    private final FeePolicyRepository repo;
    private final Clock clock;

    public PolicyService(FeePolicyRepository repo, Clock clock) {
        this.repo = repo;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<PolicyTerms> allTerms() {
        return repo.findAllByOrderByEffectiveFromAsc().stream().map(FeePolicy::terms).toList();
    }

    @Transactional(readOnly = true)
    public PolicyView view() {
        LocalDate today = LocalDate.now(clock);
        List<FeePolicy> versions = repo.findAllByOrderByEffectiveFromAsc();
        FeePolicy current = versions.stream().filter(v -> !v.getEffectiveFrom().isAfter(today))
                .reduce((a, b) -> b)
                .orElseThrow(() -> new IllegalStateException("No fee policy in force"));
        FeePolicy pending = versions.stream().filter(v -> v.getEffectiveFrom().isAfter(today))
                .reduce((a, b) -> b).orElse(null);
        return new PolicyView(PolicyDto.of(current), pending == null ? null : PolicyDto.of(pending));
    }

    /** Schedules the new terms from the 1st of next month; the current cycle keeps its terms. */
    @Transactional
    public PolicyView schedule(PolicyRequest req) {
        if (req.lateFeeMax().compareTo(req.lateFeeBase()) < 0) {
            throw ApiException.rule("LATE_FEE_MAX_TOO_LOW", "Late fee maximum must be at least the base amount");
        }
        LocalDate effective = FeeRules.firstOfMonth(LocalDate.now(clock)).plusMonths(1);
        FeePolicy version = repo.findByEffectiveFrom(effective).orElseGet(FeePolicy::new);
        version.setRegistrationFee(req.registrationFee());
        version.setSiblingDiscount2ndPct(req.siblingDiscount2ndPct());
        version.setSiblingDiscount3rdPct(req.siblingDiscount3rdPct());
        version.setLateFeeAfterDay(req.lateFeeAfterDay());
        version.setLateFeeBase(req.lateFeeBase());
        version.setLateFeePerDay(req.lateFeePerDay());
        version.setLateFeeMax(req.lateFeeMax());
        version.setEffectiveFrom(effective);
        repo.save(version);
        return view();
    }
}
