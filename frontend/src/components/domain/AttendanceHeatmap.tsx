import { cn } from "@/lib/cn";
import { addDays, formatDate, formatMonth, weekdayIndex } from "@/lib/format";
import type { PlayerAttendance } from "@/lib/types";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Weeks run left to right (Monday at the top), ending with the current week. Days without a record had no
 * session. Today gets a yellow ring.
 */
export function AttendanceHeatmap({ data, today, weeks = 14 }: { data: PlayerAttendance; today: string; weeks?: number }) {
  const status = new Map(data.days.map((d) => [d.date, d.status]));
  const lastMonday = addDays(today, -weekdayIndex(today));
  const firstMonday = addDays(lastMonday, -7 * (weeks - 1));
  const columns = Array.from({ length: weeks }, (_, w) => addDays(firstMonday, w * 7));

  return (
    <div className="scrollbar-none relative -mx-1 overflow-x-auto px-1">
      <table className="border-separate border-spacing-[3px] sm:border-spacing-[5px]" aria-label="Attendance by day">
        <thead>
          <tr>
            <th scope="col" className="w-5" />
            {columns.map((monday, i) => {
              const month = formatMonth(monday).slice(0, 3);
              const showLabel = i === 0 || formatMonth(columns[i - 1]) !== formatMonth(monday);
              return (
                <th key={monday} scope="col" className="h-5 text-left text-xs font-normal text-muted">
                  {showLabel ? month : <span className="sr-only">Week of {formatDate(monday)}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {DAY_LABELS.map((label, day) => (
            <tr key={day}>
              <th scope="row" className="pr-1 text-left text-xs font-normal text-muted">
                <span aria-hidden>{label}</span>
                <span className="sr-only">{DAY_NAMES[day]}</span>
              </th>
              {columns.map((monday) => {
                const date = addDays(monday, day);
                const s = status.get(date);
                const future = date > today;
                return (
                  <td key={date} className="p-0">
                    <span
                      title={future ? undefined : `${formatDate(date)}: ${s === "PRESENT" ? "Present" : s === "ABSENT" ? "Absent" : "No session"}`}
                      className={cn(
                        "block h-[15px] w-[15px] rounded sm:h-6 sm:w-6 sm:rounded-md",
                        s === "PRESENT" ? "bg-primary" : s === "ABSENT" ? "bg-alert" : "bg-surface",
                        future && "opacity-40",
                        date === today && "ring-2 ring-accent ring-offset-1",
                      )}
                    >
                      <span className="sr-only">
                        {formatDate(date)} {s === "PRESENT" ? "present" : s === "ABSENT" ? "absent" : "no session"}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/80">
        <li className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-primary" aria-hidden /> Present ({data.present})
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-alert" aria-hidden /> Absent ({data.absent})
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-surface ring-1 ring-line" aria-hidden /> No session
        </li>
      </ul>
    </div>
  );
}
