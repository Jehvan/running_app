import type { RunLog } from './types'

/** Ordinary least-squares fit: y = slope*x + intercept. */
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const sumXX = xs.reduce((a, x) => a + x * x, 0)
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export interface DurationTrendPoint {
  date: string
  dayOffset: number
  minutes: number
}

export interface DurationTrend {
  points: DurationTrendPoint[]
  slopeMinPerDay: number
  intercept: number
  /** Days (from the first logged run) until the trend line crosses 30 continuous minutes, if it hasn't yet and is climbing. */
  forecastDayTo30Min: number | null
}

const MIN_POINTS_FOR_TREND = 3

/** Linear-regression trend of run duration over time. Needs a few data points to be meaningful — returns null otherwise. */
export function computeDurationTrend(logs: RunLog[]): DurationTrend | null {
  if (logs.length < MIN_POINTS_FOR_TREND) return null

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const firstMs = new Date(sorted[0].date).getTime()
  const dayOffsets = sorted.map((l) => (new Date(l.date).getTime() - firstMs) / 86_400_000)
  const minutes = sorted.map((l) => l.durationSec / 60)

  const { slope, intercept } = linearRegression(dayOffsets, minutes)

  const lastOffset = dayOffsets[dayOffsets.length - 1]
  let forecastDayTo30Min: number | null = null
  if (slope > 0.005 && intercept < 30) {
    const day = (30 - intercept) / slope
    if (day > lastOffset) forecastDayTo30Min = day
  }

  return {
    points: sorted.map((l, i) => ({ date: l.date, dayOffset: dayOffsets[i], minutes: minutes[i] })),
    slopeMinPerDay: slope,
    intercept,
    forecastDayTo30Min,
  }
}

/** Regression slope of RPE over time — negative means effort is trending down (feeling easier) at whatever pace was run. */
export function computeEffortTrend(logs: RunLog[]): { slopePerWeek: number } | null {
  if (logs.length < MIN_POINTS_FOR_TREND) return null
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const firstMs = new Date(sorted[0].date).getTime()
  const dayOffsets = sorted.map((l) => (new Date(l.date).getTime() - firstMs) / 86_400_000)
  const rpe = sorted.map((l) => l.rpe)
  const { slope } = linearRegression(dayOffsets, rpe)
  return { slopePerWeek: slope * 7 }
}
