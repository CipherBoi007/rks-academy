import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, LEVEL_LABEL, LEVELS } from "@/lib/format";
import type { Progress, Skill } from "@/lib/types";

export const SKILL_LABEL: Record<Skill, string> = {
  FOOTWORK: "Footwork",
  SMASH: "Smash",
  DEFENCE: "Defence",
  NET_PLAY: "Net play",
  STAMINA: "Stamina",
};

export const SKILLS: Skill[] = ["FOOTWORK", "SMASH", "DEFENCE", "NET_PLAY", "STAMINA"];

export function SkillProgress({ progress }: { progress: Progress }) {
  const currentIndex = LEVELS.indexOf(progress.current);
  const achieved = new Map(progress.history.map((h) => [h.level, h.achievedOn]));
  const scores = new Map(progress.skills.map((s) => [s.skill, s.score]));

  return (
    <div>
      <ol className="grid grid-cols-4" aria-label="Level progression">
        {LEVELS.map((level, i) => {
          const reached = i <= currentIndex;
          const date = achieved.get(level);
          return (
            <li key={level} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span
                  className={cn("absolute right-1/2 top-4 h-0.5 w-full", i <= currentIndex ? "bg-primary" : "bg-line")}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "relative z-[1] inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold",
                  reached ? "border-ink bg-accent text-ink" : "border-line bg-white text-muted",
                  i === currentIndex && "ring-4 ring-accent/40",
                )}
                aria-hidden
              >
                {i === LEVELS.length - 1 ? <Trophy className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn("mt-2 text-xs", reached ? "font-semibold text-ink" : "text-muted")}>{LEVEL_LABEL[level]}</span>
              {date && <span className="text-[11px] text-muted">{formatDate(date)}</span>}
              <span className="sr-only">
                {i < currentIndex ? "completed" : i === currentIndex ? "current level" : "not yet reached"}
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="mt-6 space-y-4">
        {SKILLS.map((skill) => {
          const score = scores.get(skill);
          return (
            <li key={skill}>
              <div className="flex justify-between text-[15px]">
                <span className="font-semibold">{SKILL_LABEL[skill]}</span>
                <span className="text-muted">{score === undefined ? "Not assessed" : `${score}/100`}</span>
              </div>
              <div
                role="meter"
                aria-label={SKILL_LABEL[skill]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score ?? 0}
                className="relative mt-2 h-2 rounded-full bg-surface"
              >
                {score !== undefined && (
                  <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${score}%` }}>
                    <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent ring-1 ring-ink/20" />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
