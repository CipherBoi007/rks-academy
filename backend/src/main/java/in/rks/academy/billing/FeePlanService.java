package in.rks.academy.billing;

import in.rks.academy.billing.BillingDtos.FeePlanDto;
import in.rks.academy.billing.BillingDtos.FeePlanRequest;
import in.rks.academy.common.ApiException;
import in.rks.academy.player.PlayerRepository;
import in.rks.academy.security.CurrentUser;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FeePlanService {

    private final FeePlanRepository plans;
    private final PlayerRepository players;

    public FeePlanService(FeePlanRepository plans, PlayerRepository players) {
        this.plans = plans;
        this.players = players;
    }

    public List<FeePlanDto> list() {
        boolean showPrice = CurrentUser.canSeeFees();
        return plans.findByActiveTrueOrderBySortOrderAscIdAsc().stream().map(p -> toDto(p, showPrice)).toList();
    }

    public FeePlanDto get(long id) {
        return toDto(load(id), CurrentUser.canSeeFees());
    }

    @Transactional
    public FeePlanDto create(FeePlanRequest req) {
        FeePlan plan = new FeePlan();
        plan.setSortOrder(plans.maxSortOrder() + 1);
        apply(plan, req);
        plan = plans.saveAndFlush(plan);
        if (plan.isMostPopular()) {
            plans.clearMostPopularExcept(plan.getId());
        }
        return toDto(plan, true);
    }

    /** Price edits apply to payments recorded from now on; past receipts keep the amount actually charged. */
    @Transactional
    public FeePlanDto update(long id, FeePlanRequest req) {
        FeePlan plan = load(id);
        if (plan.getPeriodMonths() != req.periodMonths() && players.countByFeePlanIdAndActiveTrue(id) > 0) {
            throw ApiException.conflict("PLAN_IN_USE",
                    "Players are on this plan, so its billing period can't change. Create a new plan instead.");
        }
        if (req.mostPopular()) {
            plans.clearMostPopularExcept(id);
        }
        apply(plan, req);
        return toDto(plans.saveAndFlush(plan), true);
    }

    @Transactional
    public void archive(long id) {
        FeePlan plan = load(id);
        long using = players.countByFeePlanIdAndActiveTrue(id);
        if (using > 0) {
            throw ApiException.conflict("PLAN_IN_USE", using + " active players are on this plan. Move them first.");
        }
        plan.setActive(false);
        plan.setMostPopular(false);
    }

    private FeePlan load(long id) {
        return plans.findById(id).filter(FeePlan::isActive).orElseThrow(() -> ApiException.notFound("Fee plan", id));
    }

    private static void apply(FeePlan plan, FeePlanRequest req) {
        plan.setName(req.name().trim());
        plan.setLevelLabel(req.levelLabel().trim());
        plan.setPrice(req.price());
        plan.setPeriodMonths(req.periodMonths());
        plan.setSessionsPerWeek(req.sessionsPerWeek());
        plan.setPerks(new ArrayList<>(req.perks().stream().map(String::trim).toList()));
        plan.setMostPopular(req.mostPopular());
    }

    private FeePlanDto toDto(FeePlan p, boolean showPrice) {
        return new FeePlanDto(p.getId(), p.getName(), p.getLevelLabel(), showPrice ? p.getPrice() : null,
                p.getPeriodMonths(), p.getSessionsPerWeek(), List.copyOf(p.getPerks()), p.isMostPopular(),
                players.countByFeePlanIdAndActiveTrue(p.getId()));
    }
}
