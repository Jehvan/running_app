export interface RunLog {
  rpe: number
  pain?: { severity: number }
}

export interface AdherenceResult {
  action: 'advance' | 'hold' | 'stepBack'
  reason: string
}

/**
 * Mirrors web/src/lib/planGenerator.ts#evaluateAdherence. Kept in sync by hand
 * (small enough that a shared package would be overkill) so the server can
 * validate the action Claude is asked to explain, rather than trusting it.
 */
export function evaluateAdherence(recentLogs: RunLog[], plannedThisWeek: number): AdherenceResult {
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
