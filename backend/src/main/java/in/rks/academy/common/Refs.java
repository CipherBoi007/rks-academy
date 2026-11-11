package in.rks.academy.common;

import in.rks.academy.batch.Batch;
import in.rks.academy.billing.FeePlan;
import in.rks.academy.court.Court;
import in.rks.academy.player.Level;
import in.rks.academy.player.Player;

/** Small embedded references shared by many response DTOs. */
public final class Refs {

    private Refs() {
    }

    public record PlayerRef(long id, String code, String name, String initials, String photoUrl, Level level) {
        public static PlayerRef of(Player p) {
            return new PlayerRef(p.getId(), p.getCode(), p.getName(), Names.initials(p.getName()), p.getPhotoUrl(),
                    p.getLevel());
        }
    }

    public record PlanRef(long id, String name, int periodMonths) {
        public static PlanRef of(FeePlan p) {
            return new PlanRef(p.getId(), p.getName(), p.getPeriodMonths());
        }
    }

    public record BatchRef(long id, String name) {
        public static BatchRef of(Batch b) {
            return new BatchRef(b.getId(), b.getName());
        }
    }

    public record CourtRef(long id, String name, String surfaceType) {
        public static CourtRef of(Court c) {
            return new CourtRef(c.getId(), c.getName(), c.getSurfaceType());
        }
    }
}
