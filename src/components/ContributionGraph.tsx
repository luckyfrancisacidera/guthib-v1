import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame } from "lucide-react";

interface ContributionGraphProps {
  userId: string;
}

interface DayData {
  date: string;
  count: number;
  commits: number;
  prs: number;
  issues: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

const getLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
};

const LEVEL_CLASSES = [
  "bg-secondary",
  "bg-emerald-900/60",
  "bg-emerald-700/70",
  "bg-emerald-500",
  "bg-emerald-400",
];

const computeStreaks = (activityMap: Record<string, DayData>) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Current streak: count backwards from today
  let currentStreak = 0;
  const d = new Date(today);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (activityMap[key] && activityMap[key].count > 0) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      // Allow today to have no activity — check yesterday
      if (currentStreak === 0) {
        d.setDate(d.getDate() - 1);
        const yKey = d.toISOString().slice(0, 10);
        if (activityMap[yKey] && activityMap[yKey].count > 0) {
          currentStreak++;
          d.setDate(d.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  // Longest streak: sort all active dates
  const activeDates = Object.keys(activityMap)
    .filter((k) => activityMap[k].count > 0)
    .sort();

  let longestStreak = 0;
  let streak = 0;
  let prev: Date | null = null;
  for (const ds of activeDates) {
    const dt = new Date(ds + "T00:00:00");
    if (prev && dt.getTime() - prev.getTime() === 86400000) {
      streak++;
    } else {
      streak = 1;
    }
    if (streak > longestStreak) longestStreak = streak;
    prev = dt;
  }

  return { currentStreak, longestStreak };
};

const ContributionGraph = ({ userId }: ContributionGraphProps) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [activityMap, setActivityMap] = useState<Record<string, DayData>>({});
  const [allTimeMap, setAllTimeMap] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const yrs: number[] = [];
    for (let y = currentYear; y >= currentYear - 4; y--) yrs.push(y);
    return yrs;
  }, [currentYear]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const start = `${year}-01-01T00:00:00Z`;
      const end = `${year}-12-31T23:59:59Z`;

      // Fetch year data + all-time for streaks
      const [commitsRes, prsRes, issuesRes, allCommits, allPrs, allIssues] = await Promise.all([
        supabase.from("commits").select("created_at").eq("author_id", userId).gte("created_at", start).lte("created_at", end),
        supabase.from("pull_requests").select("created_at").eq("author_id", userId).gte("created_at", start).lte("created_at", end),
        supabase.from("issues").select("created_at").eq("author_id", userId).gte("created_at", start).lte("created_at", end),
        supabase.from("commits").select("created_at").eq("author_id", userId),
        supabase.from("pull_requests").select("created_at").eq("author_id", userId),
        supabase.from("issues").select("created_at").eq("author_id", userId),
      ]);

      const map: Record<string, DayData> = {};
      const addToDay = (m: Record<string, DayData>, dateStr: string, field: "commits" | "prs" | "issues") => {
        const d = dateStr.slice(0, 10);
        if (!m[d]) m[d] = { date: d, count: 0, commits: 0, prs: 0, issues: 0 };
        m[d][field]++;
        m[d].count++;
      };

      (commitsRes.data || []).forEach((r) => addToDay(map, r.created_at, "commits"));
      (prsRes.data || []).forEach((r) => addToDay(map, r.created_at, "prs"));
      (issuesRes.data || []).forEach((r) => addToDay(map, r.created_at, "issues"));

      const allMap: Record<string, DayData> = {};
      (allCommits.data || []).forEach((r) => addToDay(allMap, r.created_at, "commits"));
      (allPrs.data || []).forEach((r) => addToDay(allMap, r.created_at, "prs"));
      (allIssues.data || []).forEach((r) => addToDay(allMap, r.created_at, "issues"));

      setActivityMap(map);
      setAllTimeMap(allMap);
      setLoading(false);
    };
    fetchData();
  }, [userId, year]);

  const streaks = useMemo(() => computeStreaks(allTimeMap), [allTimeMap]);

  const { weeks, monthLabels, totalContributions, summary } = useMemo(() => {
    const endDate = new Date(year, 11, 31);
    const firstSunday = new Date(year, 0, 1);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());

    const weeks: DayData[][] = [];
    const monthLabels: { month: string; col: number }[] = [];
    let total = 0;
    let summaryCommits = 0, summaryPrs = 0, summaryIssues = 0;
    let lastMonth = -1;

    const current = new Date(firstSunday);
    let weekIdx = 0;

    while (current <= endDate || weeks.length < 53) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().slice(0, 10);
        const isInYear = current.getFullYear() === year;
        const dayData = isInYear ? (activityMap[dateStr] || { date: dateStr, count: 0, commits: 0, prs: 0, issues: 0 }) : { date: dateStr, count: -1, commits: 0, prs: 0, issues: 0 };

        if (isInYear && current.getMonth() !== lastMonth) {
          monthLabels.push({ month: MONTHS[current.getMonth()], col: weekIdx });
          lastMonth = current.getMonth();
        }

        if (isInYear && dayData.count >= 0) {
          total += dayData.count;
          summaryCommits += dayData.commits;
          summaryPrs += dayData.prs;
          summaryIssues += dayData.issues;
        }

        week.push(dayData);
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      weekIdx++;
      if (current > endDate && weeks.length >= 52) break;
    }

    return {
      weeks,
      monthLabels,
      totalContributions: total,
      summary: { commits: summaryCommits, prs: summaryPrs, issues: summaryIssues },
    };
  }, [activityMap, year]);

  return (
    <div className="border border-border rounded-lg p-3 sm:p-4 bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h3 className="text-xs sm:text-sm font-semibold">
          {totalContributions} contributions in {year}
        </h3>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Streaks */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-muted-foreground">Current streak:</span>
          <span className="font-semibold">{streaks.currentStreak} day{streaks.currentStreak !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-muted-foreground">Longest streak:</span>
          <span className="font-semibold">{streaks.longestStreak} day{streaks.longestStreak !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {loading ? (
        <div className="h-[120px] animate-pulse bg-secondary rounded" />
      ) : (
        <div className="overflow-x-auto -mx-3 sm:-mx-0 px-3 sm:px-0">
          <div className="inline-flex flex-col gap-0 min-w-0">
            <div className="flex gap-0">
              {/* Day labels */}
              <div className="flex flex-col gap-[2px] mr-1 pt-[16px]">
                {DAYS.map((d, i) => (
                  <span key={i} className="text-[9px] text-muted-foreground h-[12px] leading-[12px] w-6 text-right pr-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div className="relative">
                <div className="h-3 mb-[2px] relative">
                  {monthLabels.map((m, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-muted-foreground absolute"
                      style={{ left: `${m.col * 14}px` }}
                    >
                      {m.month}
                    </span>
                  ))}
                </div>
                <div className="flex gap-[2px]">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[2px]">
                      {week.map((day, di) => {
                        if (day.count < 0) {
                          return <div key={di} className="w-[12px] h-[12px]" />;
                        }
                        return (
                          <Tooltip key={di}>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-[12px] h-[12px] rounded-[2px] ${LEVEL_CLASSES[getLevel(day.count)]} cursor-pointer transition-opacity hover:opacity-80`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-semibold">{day.count} contribution{day.count !== 1 ? "s" : ""}</p>
                              <p className="text-muted-foreground">{new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                              {day.count > 0 && (
                                <div className="mt-1 space-y-0.5 text-muted-foreground">
                                  {day.commits > 0 && <p>{day.commits} commit{day.commits !== 1 ? "s" : ""}</p>}
                                  {day.prs > 0 && <p>{day.prs} pull request{day.prs !== 1 ? "s" : ""}</p>}
                                  {day.issues > 0 && <p>{day.issues} issue{day.issues !== 1 ? "s" : ""}</p>}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend + summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                {summary.commits > 0 && <span>{summary.commits} commits</span>}
                {summary.prs > 0 && <span>{summary.prs} pull requests</span>}
                {summary.issues > 0 && <span>{summary.issues} issues opened</span>}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Less</span>
                {LEVEL_CLASSES.map((cls, i) => (
                  <div key={i} className={`w-[12px] h-[12px] rounded-[2px] ${cls}`} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributionGraph;
