"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SKILL_LABEL, SKILLS } from "@/components/domain/SkillProgress";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { keys } from "@/lib/queries";
import type { Progress, Skill } from "@/lib/types";

export function SkillsSheet({
  open,
  onClose,
  playerId,
  progress,
}: {
  open: boolean;
  onClose: () => void;
  playerId: number;
  progress: Progress;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<Skill, number>>(() => fromProgress(progress));

  useEffect(() => {
    if (open) setScores(fromProgress(progress));
  }, [open, progress]);

  const save = useMutation({
    mutationFn: () => api<Progress>(`/players/${playerId}/skills`, { method: "PUT", body: { scores } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.playerProgress(playerId), updated);
      toast({ title: "Skills updated" });
      onClose();
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't save skills", description: errorMessage(e) }),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Update skills"
      description="Scores out of 100, from the coach's assessment."
      footer={
        <Button size="lg" className="w-full" loading={save.isPending} onClick={() => save.mutate()}>
          Save skills
        </Button>
      }
    >
      <ul className="space-y-6">
        {SKILLS.map((skill) => (
          <li key={skill}>
            <div className="flex items-center justify-between">
              <label htmlFor={`skill-${skill}`} className="font-semibold">
                {SKILL_LABEL[skill]}
              </label>
              <output htmlFor={`skill-${skill}`} className="font-display text-xl font-bold text-primary">
                {scores[skill]}
              </output>
            </div>
            <input
              id={`skill-${skill}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={scores[skill]}
              onChange={(e) => setScores((s) => ({ ...s, [skill]: Number(e.target.value) }))}
              className="mt-2 h-11 w-full accent-primary"
            />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function fromProgress(progress: Progress): Record<Skill, number> {
  const known = new Map(progress.skills.map((s) => [s.skill, s.score]));
  return Object.fromEntries(SKILLS.map((s) => [s, known.get(s) ?? 0])) as Record<Skill, number>;
}
