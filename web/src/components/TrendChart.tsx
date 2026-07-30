import type { DurationTrend } from '../lib/trends'

const WIDTH = 320
const HEIGHT = 160
const PAD = { top: 16, right: 16, bottom: 24, left: 34 }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TrendChart({ trend }: { trend: DurationTrend }) {
  const { points, slopeMinPerDay, intercept, forecastDayTo30Min } = trend

  const maxDay = Math.max(points[points.length - 1].dayOffset, forecastDayTo30Min ?? 0)
  const maxMinutes = Math.max(30, ...points.map((p) => p.minutes)) * 1.15

  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom

  const x = (day: number) => PAD.left + (maxDay === 0 ? 0 : (day / maxDay) * innerW)
  const y = (minutes: number) => PAD.top + innerH - (minutes / maxMinutes) * innerH

  const trendEndDay = forecastDayTo30Min ?? points[points.length - 1].dayOffset
  const lastActualDay = points[points.length - 1].dayOffset

  const goalY = y(30)

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-300" /> Logged run
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-cyan-400" /> Trend
        </span>
        {forecastDayTo30Min !== null && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full border-t-2 border-dashed border-cyan-400" />{' '}
            Projected
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Run duration trend over time">
        {/* recessive gridline at the 30-min goal */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={goalY}
          y2={goalY}
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
        <text x={WIDTH - PAD.right} y={goalY - 4} textAnchor="end" fontSize={9} fill="#64748b">
          30 min goal
        </text>

        {/* axis baseline */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
          stroke="#334155"
          strokeWidth={1}
        />

        {/* solid trend line through logged data */}
        <line
          x1={x(0)}
          y1={y(intercept)}
          x2={x(lastActualDay)}
          y2={y(intercept + slopeMinPerDay * lastActualDay)}
          stroke="#22d3ee"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* dashed projection to the goal */}
        {forecastDayTo30Min !== null && (
          <line
            x1={x(lastActualDay)}
            y1={y(intercept + slopeMinPerDay * lastActualDay)}
            x2={x(trendEndDay)}
            y2={y(30)}
            stroke="#22d3ee"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="5,5"
            opacity={0.7}
          />
        )}

        {/* logged runs */}
        {points.map((p) => (
          <circle key={p.date} cx={x(p.dayOffset)} cy={y(p.minutes)} r={5} fill="#cbd5e1">
            <title>
              {fmtDate(p.date)}: {Math.round(p.minutes)} min
            </title>
          </circle>
        ))}

        <text x={PAD.left} y={HEIGHT - 6} fontSize={9} fill="#64748b">
          {fmtDate(points[0].date)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} fontSize={9} fill="#64748b" textAnchor="end">
          {fmtDate(points[points.length - 1].date)}
        </text>
      </svg>
    </div>
  )
}
