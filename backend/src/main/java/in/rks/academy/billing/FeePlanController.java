package in.rks.academy.billing;

import in.rks.academy.billing.BillingDtos.FeePlanDto;
import in.rks.academy.billing.BillingDtos.FeePlanRequest;
import in.rks.academy.billing.BillingDtos.PolicyRequest;
import in.rks.academy.billing.BillingDtos.PolicyView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Fee plans & policy")
@RestController
@RequestMapping("/api/v1")
public class FeePlanController {

    private final FeePlanService plans;
    private final PolicyService policy;

    public FeePlanController(FeePlanService plans, PolicyService policy) {
        this.plans = plans;
        this.policy = policy;
    }

    @Operation(summary = "Active plans. Prices are null for coaches.")
    @GetMapping("/fee-plans")
    public List<FeePlanDto> list() {
        return plans.list();
    }

    @GetMapping("/fee-plans/{id}")
    public FeePlanDto get(@PathVariable long id) {
        return plans.get(id);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/fee-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public FeePlanDto create(@Valid @RequestBody FeePlanRequest req) {
        return plans.create(req);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/fee-plans/{id}")
    public FeePlanDto update(@PathVariable long id, @Valid @RequestBody FeePlanRequest req) {
        return plans.update(id, req);
    }

    @Operation(summary = "Archive a plan. Refused while active players are on it.")
    @PreAuthorize("hasRole('OWNER')")
    @DeleteMapping("/fee-plans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable long id) {
        plans.archive(id);
    }

    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/fee-policy")
    public PolicyView getPolicy() {
        return policy.view();
    }

    @Operation(summary = "Schedule new policy terms. They take effect on the 1st of next month.")
    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/fee-policy")
    public PolicyView updatePolicy(@Valid @RequestBody PolicyRequest req) {
        return policy.schedule(req);
    }
}
