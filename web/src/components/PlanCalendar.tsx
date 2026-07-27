import type { PlannedSession } from '../lib/types'

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function PlanCalendar({
  sessions,
  onStart,
}: {
  sessions: PlannedSession[]
  onStart: (session: PlannedSession) => void
}) {
  const byWeek = sessions.reduce<Record<number, PlannedSession[]>>((acc, s) => {
    ;(acc[s.week] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6 p-4 text-slate-100">
      {Object.entries(byWeek).map(([week, weekSessions]) => (
        <div key={week}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Week {week}
          </h3>
          <div className="space-y-2">
            {weekSessions
              .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
              .map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between rounded-xl border p-3 ${
                    s.status === 'done'
                      ? 'border-emerald-800 bg-emerald-950/30'
                      : s.status === 'skipped'
                        ? 'border-slate-800 bg-slate-900/50 opacity-60'
                        : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">{fmtDate(s.scheduledDate)}</div>
                    <div className="text-xs text-slate-400">
                      {s.label} · {s.targetTotalMin} min
                    </div>
                  </div>
                  {s.status === 'planned' && (
                    <button
                      onClick={() => onStart(s)}
                      className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-slate-950"
                    >
                      Start
                    </button>
                  )}
                  {s.status === 'done' && <span className="text-lg">✅</span>}
                  {s.status === 'skipped' && <span className="text-lg">⏭️</span>}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
