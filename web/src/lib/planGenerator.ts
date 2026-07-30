import type { BodyMetrics, Interval, Plan, PlannedSession, Profile, RunLog } from './types'

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

/**
 * Starting tier, derived from BMI when height/weight are provided (see
 * `tierFor`). A randomized trial of obese novice runners found starting
 * with a much lower first-week running volume roughly halved injury risk
 * (10.5% vs 26.8%), so 'conservative' both starts gentler and advances at
 * half speed rather than the standard one-stage-per-week pace.
 * BMI is only ever used internally here — never shown back to the user.
 */
type StartingTier = 'standard' | 'moderate' | 'conservative'

const EARLY_STAGES: Record<StartingTier, Interval[][]> = {
  standard: [PROGRESSION[0], PROGRESSION[1]],
  moderate: [[{ runSec: 45, walkSec: 105, reps: 8 }], [{ runSec: 70, walkSec: 110, reps: 6 }]],
  conservative: [[{ runSec: 30, walkSec: 120, reps: 6 }], [{ runSec: 45, walkSec: 120, reps: 6 }]],
}

const STEPS_PER_STAGE: Record<StartingTier, number> = {
  standard: 1,
  moderate: 1,
  conservative: 2,
}

function computeBMI(body?: BodyMetrics): number | null {
  if (!body || body.heightCm <= 0 || body.weightKg <= 0) return null
  const heightM = body.heightCm / 100
  return body.weightKg / (heightM * heightM)
}

function tierFor(profile: Profile): StartingTier {
  const bmi = computeBMI(profile.body)
  if (bmi === null) return 'standard'
  if (bmi >= 30) return 'conservative'
  if (bmi >= 25) return 'moderate'
  return 'standard'
}

function stageAtIndex(tier: StartingTier, idx: number): Interval[] {
  const early = EARLY_STAGES[tier]
  return idx < early.length ? early[idx] : PROGRESSION[idx]
}

function stageForWeek(week: number, tier: StartingTier): Interval[] {
  const stepsPerStage = STEPS_PER_STAGE[tier]
  const idx = Math.min(Math.floor((week - 1) / stepsPerStage), PROGRESSION.length - 1)
  // every 4th week, hold at the previous stage instead of advancing
  if (week % CUTBACK_EVERY === 0 && idx > 0) {
    return stageAtIndex(tier, idx - 1)
  }
  return stageAtIndex(tier, idx)
}

/** kcal estimate for a run/walk session, MET ≈ 7 (a reasonable average for interval jogging pace). */
export function estimateCalories(weightKg: number, durationSec: number): number {
  return Math.round(7 * weightKg * (durationSec / 3600))
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
  const tier = tierFor(plan.generatedFrom)
  const intervals = stageForWeek(week, tier)
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
