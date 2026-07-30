export type SessionType = 'run' | 'rest' | 'cross'
export type SessionStatus = 'planned' | 'done' | 'skipped' | 'moved'
export type RPE = 1 | 2 | 3 | 4 | 5

export interface Interval {
  runSec: number
  walkSec: number
  reps: number
}

export interface PlannedSession {
  id: string
  planId: string
  week: number
  dayIndex: number // 0-6, position within the week
  scheduledDate: string // ISO date
  type: SessionType
  label: string
  intervals: Interval[]
  targetTotalMin: number
  status: SessionStatus
}

export type UnitSystem = 'imperial' | 'metric'

export interface BodyMetrics {
  units: UnitSystem
  heightCm: number
  weightKg: number
}

export interface Profile {
  daysPerWeek: number
  preferredDays: number[] // 0=Sun..6=Sat
  longestContinuousRunMin: number
  goal: 'habit' | '5k' | '10k-half'
  injuryNotes: string
  createdAt: string
  // Optional — used only to pick a safer starting run/walk ratio and to
  // estimate calories burned. Never shown back to the user as a number
  // or label; see planGenerator.ts#startingTierFor.
  body?: BodyMetrics
}

export interface Plan {
  id: string
  createdAt: string
  goal: Profile['goal']
  startDate: string
  currentWeek: number
  status: 'active' | 'completed' | 'abandoned'
  generatedFrom: Profile
}

export interface PainReport {
  location: string
  severity: 1 | 2 | 3
}

export interface RunLog {
  id: string
  sessionId?: string
  date: string
  durationSec: number
  distanceM?: number
  intervalsCompleted: number
  rpe: RPE
  mood: 'great' | 'ok' | 'rough'
  pain?: PainReport
  notes?: string
  source: 'timer' | 'manual'
}

export interface AdaptationEvent {
  id: string
  date: string
  trigger: string
  action: string
  reason: string
}
