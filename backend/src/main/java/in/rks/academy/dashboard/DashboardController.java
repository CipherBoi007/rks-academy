package in.rks.academy.dashboard;

import in.rks.academy.dashboard.DashboardService.CourtDay;
import in.rks.academy.dashboard.DashboardService.Summary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dashboard")
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @Operation(summary = "KPIs. Fee figures are null for coaches.")
    @GetMapping("/summary")
    public Summary summary() {
        return dashboard.summary();
    }

    @GetMapping("/today-courts")
    public List<CourtDay> todayCourts() {
        return dashboard.todayCourts();
    }
}
