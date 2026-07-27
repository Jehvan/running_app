import { useState } from 'react'
import type { RPE, RunLog } from '../lib/types'

const RPE_OPTIONS: { value: RPE; label: string }[] = [
  { value: 2, label: 'Easy' },
  { value: 3, label: 'Okay' },
  { value: 5, label: 'Hard' },
]

export function CheckInModal({
  durationSec,
  onSave,
  onClose,
}: {
  durationSec: number
  onSave: (entry: Pick<RunLog, 'rpe' | 'mood' | 'pain' | 'notes'>) => void
  onClose: () => void
}) {
  const [rpe, setRpe] = useState<RPE>(3)
  const [mood, setMood] = useState<RunLog['mood']>('ok')
  const [hasPain, setHasPain] = useState(false)
  const [painSeverity, setPainSeverity] = useState<1 | 2 | 3>(1)
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-slate-900 p-6 text-slate-100 sm:rounded-2xl">
        <h2 className="mb-1 text-lg font-bold">Nice work! 🎉</h2>
        <p className="mb-4 text-sm text-slate-400">
          {Math.floor(durationSec / 60)} min {durationSec % 60}s — quick check-in.
        </p>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">How did it feel?</div>
          <div className="flex gap-2">
            {RPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRpe(opt.value)}
                className={`flex-1 rounded-lg border py-2 text-sm ${
                  rpe === opt.value ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">Mood</div>
          <div className="flex gap-2">
            {(['great', 'ok', 'rough'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`flex-1 rounded-lg border py-2 text-sm capitalize ${
                  mood === m ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasPain} onChange={(e) => setHasPain(e.target.checked)} />
          I felt pain (not just normal soreness)
        </label>

        {hasPain && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium">Severity</div>
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setPainSeverity(s as 1 | 2 | 3)}
                  className={`flex-1 rounded-lg border py-2 text-sm ${
                    painSeverity === s ? 'border-amber-400 bg-amber-950/30' : 'border-slate-700'
                  }`}
                >
                  {s === 1 ? 'Mild' : s === 2 ? 'Moderate' : 'Sharp'}
                </button>
              ))}
            </div>
            {painSeverity >= 2 && (
              <p className="mt-2 text-xs text-amber-400">
                Consider resting and seeing a professional if this persists.
              </p>
            )}
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
          rows={2}
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-3">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                rpe,
                mood,
                pain: hasPain ? { location: 'unspecified', severity: painSeverity } : undefined,
                notes: notes || undefined,
              })
            }
            className="flex-1 rounded-xl bg-cyan-500 py-3 font-semibold text-slate-950"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
