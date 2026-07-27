import Dexie, { type Table } from 'dexie'
import type { AdaptationEvent, Plan, PlannedSession, Profile, RunLog } from './types'

class RunPlanDB extends Dexie {
  profile!: Table<Profile & { id: string }, string>
  plans!: Table<Plan, string>
  sessions!: Table<PlannedSession, string>
  logs!: Table<RunLog, string>
  events!: Table<AdaptationEvent, string>

  constructor() {
    super('runplan-db')
    this.version(1).stores({
      profile: 'id',
      plans: 'id, status',
      sessions: 'id, planId, week, scheduledDate, status',
      logs: 'id, sessionId, date',
      events: 'id, date',
    })
  }
}

export const db = new RunPlanDB()

export async function exportBackup() {
  const [profile, plans, sessions, logs, events] = await Promise.all([
    db.profile.toArray(),
    db.plans.toArray(),
    db.sessions.toArray(),
    db.logs.toArray(),
    db.events.toArray(),
  ])
  return { version: 1, exportedAt: new Date().toISOString(), profile, plans, sessions, logs, events }
}

export async function importBackup(data: Awaited<ReturnType<typeof exportBackup>>) {
  await db.transaction('rw', db.profile, db.plans, db.sessions, db.logs, db.events, async () => {
    await Promise.all([
      db.profile.clear(),
      db.plans.clear(),
      db.sessions.clear(),
      db.logs.clear(),
      db.events.clear(),
    ])
    await db.profile.bulkAdd(data.profile)
    await db.plans.bulkAdd(data.plans)
    await db.sessions.bulkAdd(data.sessions)
    await db.logs.bulkAdd(data.logs)
    await db.events.bulkAdd(data.events)
  })
}
