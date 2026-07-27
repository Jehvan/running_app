import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { evaluateAdherence, type RunLog } from './adherence.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/adjust-plan', async (req, res) => {
  try {
    const { plan, recentLogs, upcoming } = req.body as {
      plan: { currentWeek: number; goal: string }
      recentLogs: RunLog[]
      upcoming: { label: string; targetTotalMin: number }[]
    }

    const decision = evaluateAdherence(recentLogs ?? [], (recentLogs ?? []).length || upcoming?.length || 0)

    if (!anthropic) {
      return res.json({ ...decision, coachNote: decision.reason })
    }

    const summary = {
      week: plan?.currentWeek,
      goal: plan?.goal,
      logsThisWeek: recentLogs?.length ?? 0,
      avgRpe: recentLogs?.length
        ? recentLogs.reduce((s, l) => s + l.rpe, 0) / recentLogs.length
        : null,
      painReported: recentLogs?.some((l) => l.pain && l.pain.severity >= 2) ?? false,
      decidedAction: decision.action,
      nextSessionPreview: upcoming?.[0]?.label,
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      system:
        'You are an encouraging, safety-conscious running coach for a beginner. ' +
        'A rule-based system has ALREADY decided whether to advance, hold, or step back the ' +
        'training plan this week — you do not get to change that decision. Your only job is to ' +
        'write a short (2-3 sentence), warm, specific coach note explaining the decision and what ' +
        'happens next, referencing the data given. Never give medical diagnoses; if pain was reported, ' +
        'gently suggest resting and seeing a professional if it persists. No markdown, plain text only.',
      messages: [{ role: 'user', content: JSON.stringify(summary) }],
    })

    const text = message.content.find((c) => c.type === 'text')
    const coachNote = text && 'text' in text ? text.text.trim() : decision.reason

    res.json({ ...decision, coachNote })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to adjust plan' })
  }
})

const port = Number(process.env.PORT) || 8787
app.listen(port, () => {
  console.log(`runplan-server listening on :${port}`)
})
