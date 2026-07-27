import type { Plan, PlannedSession, RunLog } from './types'

export interface AdjustPlanResponse {
  action: 'advance' | 'hold' | 'stepBack'
  reason: string
  coachNote: string
}

/**
 * Calls the backend, which asks Claude to write a short, encouraging
 * explanation for the adaptation the rule-based guardrails already decided.
 * The model never chooses the action itself — see server/src/adjust.ts.
 */
export async function requestPlanAdjustment(
  plan: Plan,
  recentLogs: RunLog[],
  upcoming: PlannedSession[],
): Promise<AdjustPlanResponse> {
  const res = await fetch('/api/adjust-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, recentLogs, upcoming }),
  })
  if (!res.ok) throw new Error(`Adjust request failed: ${res.status}`)
  return res.json()
}
