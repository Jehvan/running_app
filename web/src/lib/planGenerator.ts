import type { Interval, Plan, PlannedSession, Profile, RunLog } from './types'

/**
 * Beginner run/walk progression, loosely modeled on Couch-to-5K.
 * Each stage is a fixed set of intervals; every 4th week is a cutback week
 * (repeat the previous stage) so fitness catches up before the next jump.
 */
const PROGRESSION: Interval[][] = [
  [{ runSec: 60, walkSec: 90, reps: 8 }], // wk1: 1min run / 1:30 walk
  [{ runSec: 90, walkSec: 120, reps: 6 }], // wk2
  [{ runSec: 180, walkSec: 90, reps: 4 }], // wk3: 3min run / 1:30 walk
  [{ runSec: 300, walkSec: 180, reps: 3 }], // wk4: cutback-ish, 5min run
  [{ runSec: 480, walkSec: 120, reps: 2 }], // wk5: 8min run
  [{ runSec: 600, walkSec: 90, reps: 2 }], // wk6: 10min run
  [{ runSec: 900, walkSec: 60, reps: 1 }, { runSec: 600, walkSec: 0, reps: 1 }], // wk7
  [{ runSec: 1500, walkSec: 0, reps: 1 }], // wk8: 25min continuous
  [{ runSec: 1800, walkSec: 0, reps: 1 }], // wk9+: 30min continuous (maintenance)
]

const CUTBACK_EVERY = 4

function stageForWeek(week: number): Interval[] {
  const idx = Math.min(week - 1, PROGRESSION.length - 1)
  // every 4th week, hold at the previous stage instead of advancing
  if (week % CUTBACK_EVERY === 0 && idx > 0) {
    return PROGRESSION[idx - 1]
  }
  return PROGRESSION[idx]
}

function totalMinutes(intervals: Interval[]): number {
  const sec = intervals.reduce((sum, i) => sum + (i.runSec + i.walkSec) * i.reps, 0)
  return Math.round(sec / 60)
}

function labelFor(week: number, intervals: Interval[]): string {
  if (week % CUTBACK_EVERY === 0) return 'Cutback week — hold steady'
  const longestRun = Math.max(...intervals.map((i) => i.runSec))
  if (longestRun >= 1800) return 'Continuous 30 min run'
  if (intervals.length === 1 && intervals[0].walkSec === 0) {
    return `Continuous ${Math.round(longestRun / 60)} min run`
  }
  return `Run/walk intervals`
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Spread `count` run days evenly across the week with at least one rest day between them. */
function spreadDays(count: number, preferred: number[]): number[] {
  if (preferred.length >= count) return preferred.slice(0, count).sort((a, b) => a - b)
  const spacing = Math.floor(7 / count)
  const days: number[] = []
  for (let i = 0; i < count; i++) days.push(Math.min(6, i * spacing))
  return days
}

export function generateWeekSessions(plan: Plan, week: number): PlannedSession[] {
  const intervals = stageForWeek(week)
  const days = spreadDays(plan.generatedFrom.daysPerWeek, plan.generatedFrom.preferredDays)
  const weekStart = addDays(plan.startDate, (week - 1) * 7)
  const label = labelFor(week, intervals)
  const target = totalMinutes(intervals)

  return days.map((dayIndex, i) => ({
    id: `${plan.id}-w${week}-d${i}`,
    planId: plan.id,
    week,
    dayIndex,
    scheduledDate: addDays(weekStart, dayIndex),
    type: 'run' as const,
    label,
    intervals,
    targetTotalMin: target,
    status: 'planned' as const,
  }))
}

export function createPlan(profile: Profile): Plan {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    goal: profile.goal,
    startDate: today,
    currentWeek: 1,
    status: 'active',
    generatedFrom: profile,
  }
}

export interface AdaptationResult {
  action: 'advance' | 'hold' | 'stepBack'
  reason: string
}

/**
 * Rule-based safety net that runs before/alongside the AI adjuster:
 * never let the plan advance faster than the guardrails below, regardless
 * of what a model suggests.
 */
export function evaluateAdherence(recentLogs: RunLog[], plannedThisWeek: number): AdaptationResult {
  const completed = recentLogs.length
  const hardCount = recentLogs.filter((l) => l.rpe >= 4).length
  const painReported = recentLogs.some((l) => l.pain && l.pain.severity >= 2)

  if (painReported) {
    return { action: 'stepBack', reason: 'Pain reported at moderate+ severity — backing off and holding volume steady.' }
  }
  if (completed === 0 && plannedThisWeek > 0) {
    return { action: 'stepBack', reason: 'No sessions completed this week — repeating the same week rather than piling on.' }
  }
  if (hardCount >= 2) {
    return { action: 'hold', reason: 'Multiple sessions felt hard — holding this week’s stage instead of advancing.' }
  }
  if (completed < plannedThisWeek) {
    return { action: 'hold', reason: 'Missed a planned session — repeating this stage before moving on.' }
  }
  return { action: 'advance', reason: 'Sessions completed and felt manageable — progressing to the next stage.' }
}
