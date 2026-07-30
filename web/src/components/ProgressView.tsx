import { estimateCalories } from '../lib/planGenerator'
import type { Plan, RunLog } from '../lib/types'

function fmtMinSec(sec: number) {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
}

export function ProgressView({ plan, logs }: { plan: Plan | null; logs: RunLog[] }) {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const totalRuns = sorted.length
  const totalSeconds = sorted.reduce((s, l) => s + l.durationSec, 0)
  const totalMinutes = Math.round(totalSeconds / 60)
  const longestRun = sorted.reduce((max, l) => Math.max(max, l.durationSec), 0)
  const firstRun = sorted[0]
  const weightKg = plan?.generatedFrom.body?.weightKg
  const totalCalories = weightKg ? estimateCalories(weightKg, totalSeconds) : null

  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const recent = sorted.filter((l) => new Date(l.date) >= fourWeeksAgo)

  return (
    <div className="space-y-4 p-4 text-slate-100">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total runs" value={String(totalRuns)} />
        <StatCard label="Total time" value={`${totalMinutes} min`} />
        <StatCard label="Longest run" value={fmtMinSec(longestRun)} />
        {totalCalories !== null ? (
          <StatCard label="Calories burned" value={`${totalCalories} kcal`} />
        ) : (
          <StatCard label="Current week" value={plan ? `Week ${plan.currentWeek}` : '—'} />
        )}
      </div>

      {firstRun && (
        <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4">
          <div className="text-sm font-semibold text-cyan-300">Look how far you've come</div>
          <p className="mt-1 text-sm text-slate-300">
            Your first logged run was {fmtMinSec(firstRun.durationSec)}. Your longest so far is{' '}
            {fmtMinSec(longestRun)}.
          </p>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Last 4 weeks
        </h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No runs logged yet this month — get started today!</p>
        ) : (
          <div className="space-y-2">
            {recent
              .slice()
              .reverse()
              .map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
                >
                  <span>{new Date(l.date).toLocaleDateString()}</span>
                  <span className="text-slate-400">{fmtMinSec(l.durationSec)}</span>
                  <span className="capitalize text-slate-400">{l.mood}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}
