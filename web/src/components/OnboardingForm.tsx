import { useState } from 'react'
import type { Profile, UnitSystem } from '../lib/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function OnboardingForm({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 3, 5])
  const [goal, setGoal] = useState<Profile['goal']>('habit')
  const [injuryNotes, setInjuryNotes] = useState('')

  const [units, setUnits] = useState<UnitSystem>('imperial')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightLb, setWeightLb] = useState('')
  const [weightKg, setWeightKg] = useState('')

  function toggleDay(day: number) {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  function submit() {
    const body = (() => {
      if (units === 'imperial') {
        const ft = parseFloat(heightFt)
        const inch = parseFloat(heightIn) || 0
        const lb = parseFloat(weightLb)
        if (!ft || !lb) return undefined
        return { units, heightCm: (ft * 12 + inch) * 2.54, weightKg: lb * 0.453592 }
      }
      const cm = parseFloat(heightCm)
      const kg = parseFloat(weightKg)
      if (!cm || !kg) return undefined
      return { units, heightCm: cm, weightKg: kg }
    })()

    onComplete({
      daysPerWeek,
      preferredDays: preferredDays.length ? preferredDays : [1, 3, 5],
      longestContinuousRunMin: 0,
      goal,
      injuryNotes,
      createdAt: new Date().toISOString(),
      body,
    })
  }

  return (
    <div className="mx-auto max-w-md p-6 text-slate-100">
      <h1 className="mb-1 text-2xl font-bold">Welcome 👋</h1>
      <p className="mb-6 text-slate-400">
        A few quick questions so we can build a beginner-safe plan for you.
      </p>

      <label className="mb-2 block text-sm font-medium text-slate-300">What's the goal?</label>
      <div className="mb-6 grid grid-cols-1 gap-2">
        {[
          { v: 'habit', label: 'Build a running habit', sub: 'Consistency first, no race target' },
          { v: '5k', label: 'Train for a 5K', sub: 'Build toward 5K by a target date' },
          { v: '10k-half', label: '10K or half marathon', sub: 'Longer build-up' },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => setGoal(opt.v as Profile['goal'])}
            className={`rounded-xl border p-3 text-left transition ${
              goal === opt.v ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700 bg-slate-900'
            }`}
          >
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs text-slate-400">{opt.sub}</div>
          </button>
        ))}
      </div>

      <label className="mb-2 block text-sm font-medium text-slate-300">
        How many days a week can you run?
      </label>
      <div className="mb-6 flex gap-2">
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setDaysPerWeek(n)}
            className={`flex-1 rounded-xl border py-2 font-medium ${
              daysPerWeek === n ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700 bg-slate-900'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <label className="mb-2 block text-sm font-medium text-slate-300">Which days work best?</label>
      <div className="mb-6 flex gap-1">
        {DAY_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => toggleDay(i)}
            className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
              preferredDays.includes(i) ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700 bg-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-2 block text-sm font-medium text-slate-300">
        Any injuries or pain we should know about? (optional)
      </label>
      <textarea
        value={injuryNotes}
        onChange={(e) => setInjuryNotes(e.target.value)}
        className="mb-6 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm"
        rows={2}
        placeholder="e.g. previous knee issue"
      />

      <div className="mb-6 flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-300">
          Height &amp; weight (optional)
        </label>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setUnits('imperial')}
            className={`rounded-md border px-2 py-1 ${units === 'imperial' ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700'}`}
          >
            ft/lb
          </button>
          <button
            onClick={() => setUnits('metric')}
            className={`rounded-md border px-2 py-1 ${units === 'metric' ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700'}`}
          >
            cm/kg
          </button>
        </div>
      </div>
      <p className="-mt-4 mb-3 text-xs text-slate-500">
        Only used to pick a safer starting pace — never shown or tracked as a goal.
      </p>
      {units === 'imperial' ? (
        <div className="mb-6 grid grid-cols-3 gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={heightFt}
            onChange={(e) => setHeightFt(e.target.value)}
            placeholder="ft"
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
            placeholder="in"
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            value={weightLb}
            onChange={(e) => setWeightLb(e.target.value)}
            placeholder="lb"
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm"
          />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="cm"
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="kg"
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm"
          />
        </div>
      )}

      <button
        onClick={submit}
        className="w-full rounded-xl bg-cyan-500 py-3 font-semibold text-slate-950 active:bg-cyan-400"
      >
        Build my plan
      </button>
      <p className="mt-4 text-center text-xs text-slate-500">
        This app gives general guidance only, not medical advice. Stop and consult a professional
        if you experience sharp or persistent pain.
      </p>
    </div>
  )
}
