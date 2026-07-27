import type { Plan, PlannedSession, RunLog } from './types'

export interface AdjustPlanResponse {
  action: 'advance' | 'hold' | 'stepBack'
  reason: string
  coachNote: string
}

// In dev, Vite's proxy forwards /api to the local server (see vite.config.ts).
// In production (GitHub Pages is static-only), this points at the deployed
// server instead — set at build time via the VITE_API_BASE_URL env var.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Calls the backend, which asks Claude to write a short, encouraging
 * explanation for the adaptation the rule-based guardrails already decided.
 * The model never chooses the action itself — see server/src/index.ts.
 */
export async function requestPlanAdjustment(
  plan: Plan,
  recentLogs: RunLog[],
  upcoming: PlannedSession[],
): Promise<AdjustPlanResponse> {
  const res = await fetch(`${API_BASE}/api/adjust-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, recentLogs, upcoming }),
  })
  if (!res.ok) throw new Error(`Adjust request failed: ${res.status}`)
  return res.json()
}
