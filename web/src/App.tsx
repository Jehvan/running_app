import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportBackup, importBackup } from './lib/db'
import { createPlan, evaluateAdherence, generateWeekSessions } from './lib/planGenerator'
import { requestPlanAdjustment } from './lib/api'
import type { Plan, PlannedSession, Profile, RunLog } from './lib/types'
import { OnboardingForm } from './components/OnboardingForm'
import { Timer } from './components/Timer'
import { CheckInModal } from './components/CheckInModal'
import { PlanCalendar } from './components/PlanCalendar'
import { ProgressView } from './components/ProgressView'

type Tab = 'today' | 'plan' | 'progress'

export default function App() {
  const profile = useLiveQuery(() => db.profile.toArray(), [])
  const plans = useLiveQuery(() => db.plans.where('status').equals('active').toArray(), [])
  const plan: Plan | undefined = plans?.[0]
  const sessions = useLiveQuery(
    () => (plan ? db.sessions.where('planId').equals(plan.id).toArray() : []),
    [plan?.id],
  )
  const logs = useLiveQuery(() => db.logs.toArray(), [])

  const [tab, setTab] = useState<Tab>('today')
  const [activeSession, setActiveSession] = useState<PlannedSession | null>(null)
  const [pendingLog, setPendingLog] = useState<{ elapsedSec: number; intervalsCompleted: number } | null>(
    null,
  )
  const [coachNote, setCoachNote] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const todaysSession = useMemo(
    () => sessions?.find((s) => s.scheduledDate === today && s.status === 'planned'),
    [sessions, today],
  )
  const upcoming = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => s.status === 'planned')
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    [sessions],
  )

  async function handleOnboardingComplete(p: Profile) {
    await db.profile.add({ ...p, id: 'me' })
    const newPlan = createPlan(p)
    await db.plans.add(newPlan)
    const week1 = generateWeekSessions(newPlan, 1)
    await db.sessions.bulkAdd(week1)
  }

  async function handleFinishSession(elapsedSec: number, intervalsCompleted: number) {
    setPendingLog({ elapsedSec, intervalsCompleted })
  }

  async function handleSaveCheckIn(entry: Pick<RunLog, 'rpe' | 'mood' | 'pain' | 'notes'>) {
    if (!activeSession || !pendingLog || !plan) return
    const log: RunLog = {
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      date: new Date().toISOString(),
      durationSec: pendingLog.elapsedSec,
      intervalsCompleted: pendingLog.intervalsCompleted,
      rpe: entry.rpe,
      mood: entry.mood,
      pain: entry.pain,
      notes: entry.notes,
      source: 'timer',
    }
    await db.logs.add(log)
    await db.sessions.update(activeSession.id, { status: 'done' })

    setActiveSession(null)
    setPendingLog(null)
    await maybeAdvanceWeek(plan)
  }

  async function maybeAdvanceWeek(currentPlan: Plan) {
    const weekSessions = await db.sessions
      .where('planId')
      .equals(currentPlan.id)
      .and((s) => s.week === currentPlan.currentWeek)
      .toArray()
    const allResolved = weekSessions.length > 0 && weekSessions.every((s) => s.status !== 'planned')
    if (!allResolved) return

    const allLogs = await db.logs.toArray()
    const weekLogs = allLogs.filter((l) => weekSessions.some((s) => s.id === l.sessionId))
    const decision = evaluateAdherence(weekLogs, weekSessions.length)

    let reason = decision.reason
    try {
      const nextWeekPreview = generateWeekSessions(
        { ...currentPlan, currentWeek: currentPlan.currentWeek + 1 },
        currentPlan.currentWeek + 1,
      )
      const ai = await requestPlanAdjustment(currentPlan, weekLogs, nextWeekPreview)
      reason = ai.coachNote || reason
    } catch {
      // AI adjustment is a nice-to-have; the rule-based decision above always stands.
    }

    await db.events.add({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      trigger: `week ${currentPlan.currentWeek} complete`,
      action: decision.action,
      reason,
    })
    setCoachNote(reason)

    const nextWeek =
      decision.action === 'advance'
        ? currentPlan.currentWeek + 1
        : decision.action === 'hold'
          ? currentPlan.currentWeek
          : Math.max(1, currentPlan.currentWeek - 1)

    await db.plans.update(currentPlan.id, { currentWeek: nextWeek })
    const already = await db.sessions
      .where('planId')
      .equals(currentPlan.id)
      .and((s) => s.week === nextWeek)
      .count()
    if (already === 0) {
      const nextSessions = generateWeekSessions({ ...currentPlan, currentWeek: nextWeek }, nextWeek)
      await db.sessions.bulkAdd(nextSessions)
    }
  }

  async function handleSkip(session: PlannedSession) {
    await db.sessions.update(session.id, { status: 'skipped' })
    if (plan) await maybeAdvanceWeek(plan)
  }

  async function handleBackup() {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `runplan-backup-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleRestore(file: File) {
    const text = await file.text()
    await importBackup(JSON.parse(text))
  }

  if (profile === undefined) return null // loading

  if (profile.length === 0) {
    return <OnboardingForm onComplete={handleOnboardingComplete} />
  }

  if (activeSession && !pendingLog) {
    return <Timer session={activeSession} onFinish={handleFinishSession} />
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <header className="flex items-center justify-between border-b border-slate-800 p-4">
        <h1 className="text-lg font-bold text-slate-100">Couch to Consistent</h1>
        <div className="flex gap-3 text-xs text-slate-400">
          <button onClick={handleBackup} className="underline underline-offset-2">
            Export
          </button>
          <label className="cursor-pointer underline underline-offset-2">
            Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleRestore(e.target.files[0])}
            />
          </label>
        </div>
      </header>

      {coachNote && (
        <div className="m-4 rounded-xl border border-cyan-800 bg-cyan-950/40 p-3 text-sm text-cyan-200">
          <div className="mb-1 font-semibold">Plan update</div>
          {coachNote}
          <button onClick={() => setCoachNote(null)} className="ml-2 text-xs text-cyan-400 underline">
            dismiss
          </button>
        </div>
      )}

      {tab === 'today' && (
        <div className="p-4 text-slate-100">
          {todaysSession ? (
            <div className="rounded-2xl border border-cyan-800 bg-cyan-950/30 p-5">
              <div className="text-sm text-cyan-300">Today</div>
              <div className="mt-1 text-xl font-bold">{todaysSession.label}</div>
              <div className="mt-1 text-sm text-slate-400">{todaysSession.targetTotalMin} min</div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setActiveSession(todaysSession)}
                  className="flex-1 rounded-xl bg-cyan-500 py-3 font-semibold text-slate-950"
                >
                  Start
                </button>
                <button
                  onClick={() => handleSkip(todaysSession)}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
              <div className="text-lg font-semibold">Rest day 😌</div>
              <p className="mt-1 text-sm text-slate-400">Recovery is part of the plan.</p>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Up next
              </h3>
              <div className="space-y-2">
                {upcoming.slice(0, 3).map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
                    {new Date(s.scheduledDate + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    — {s.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'plan' && <PlanCalendar sessions={sessions ?? []} onStart={setActiveSession} />}
      {tab === 'progress' && <ProgressView plan={plan ?? null} logs={logs ?? []} />}

      {pendingLog && (
        <CheckInModal
          durationSec={pendingLog.elapsedSec}
          onSave={handleSaveCheckIn}
          onClose={() => {
            setActiveSession(null)
            setPendingLog(null)
          }}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-slate-800 bg-slate-950">
        {(['today', 'plan', 'progress'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm capitalize ${tab === t ? 'text-cyan-400' : 'text-slate-500'}`}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  )
}
