import { useEffect, useMemo, useRef, useState } from 'react'
import type { Interval, PlannedSession } from '../lib/types'

type Phase = 'run' | 'walk' | 'done'

interface Step {
  phase: 'run' | 'walk'
  seconds: number
}

function buildSteps(intervals: Interval[]): Step[] {
  const steps: Step[] = []
  for (const iv of intervals) {
    for (let r = 0; r < iv.reps; r++) {
      if (iv.runSec > 0) steps.push({ phase: 'run', seconds: iv.runSec })
      if (iv.walkSec > 0) steps.push({ phase: 'walk', seconds: iv.walkSec })
    }
  }
  return steps
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 1
  window.speechSynthesis.speak(utter)
}

function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}

export function Timer({
  session,
  onFinish,
}: {
  session: PlannedSession
  onFinish: (elapsedSec: number, intervalsCompleted: number) => void
}) {
  const steps = useMemo(() => buildSteps(session.intervals), [session])
  const [stepIndex, setStepIndex] = useState(0)
  const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const announcedRef = useRef(false)

  const phase: Phase = stepIndex >= steps.length ? 'done' : steps[stepIndex].phase

  useEffect(() => {
    if (!announcedRef.current && running) {
      announcedRef.current = true
      speak(phase === 'run' ? 'Run' : 'Walk')
      vibrate(phase === 'run' ? [200] : [80, 80, 80])
    }
  }, [running, phase])

  useEffect(() => {
    if (!running || phase === 'done') return
    const t = setInterval(() => {
      setElapsed((e) => e + 1)
      setRemaining((r) => {
        if (r <= 1) {
          setStepIndex((i) => i + 1)
          announcedRef.current = false
          return steps[stepIndex + 1]?.seconds ?? 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, stepIndex, phase])

  useEffect(() => {
    if (phase === 'done' && running) {
      speak('Session complete. Nice work.')
      vibrate([300, 100, 300])
      setRunning(false)
    }
  }, [phase, running])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex flex-col items-center gap-6 p-6 text-slate-100">
      <div className="text-sm uppercase tracking-widest text-slate-400">{session.label}</div>

      <div
        className={`flex h-56 w-56 flex-col items-center justify-center rounded-full border-8 text-center ${
          phase === 'run'
            ? 'border-cyan-400 bg-cyan-950/40'
            : phase === 'walk'
              ? 'border-amber-400 bg-amber-950/30'
              : 'border-emerald-400 bg-emerald-950/30'
        }`}
      >
        <div className="text-xs uppercase tracking-widest text-slate-400">
          {phase === 'done' ? 'Done' : phase}
        </div>
        <div className="text-5xl font-bold tabular-nums">
          {phase === 'done' ? '🎉' : `${mins}:${secs.toString().padStart(2, '0')}`}
        </div>
      </div>

      <div className="text-sm text-slate-400">
        Step {Math.min(stepIndex + 1, steps.length)} of {steps.length} · elapsed{' '}
        {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
      </div>

      {phase !== 'done' ? (
        <button
          onClick={() => setRunning((r) => !r)}
          className="w-full max-w-xs rounded-xl bg-cyan-500 py-3 text-lg font-semibold text-slate-950"
        >
          {running ? 'Pause' : 'Start'}
        </button>
      ) : (
        <button
          onClick={() => onFinish(elapsed, stepIndex)}
          className="w-full max-w-xs rounded-xl bg-emerald-500 py-3 text-lg font-semibold text-slate-950"
        >
          Log this run
        </button>
      )}

      {phase !== 'done' && (
        <button
          onClick={() => onFinish(elapsed, stepIndex)}
          className="text-sm text-slate-400 underline underline-offset-2"
        >
          End early &amp; log
        </button>
      )}
    </div>
  )
}
