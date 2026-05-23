import { Pool } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

export type Migration = (client: any) => Promise<void>

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

async function run() {
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir).sort()

  const client = await pool.connect()
  try {
    for (const file of files) {
      if (!file.endsWith('.ts')) continue
      console.log(`Running migration: ${file}`)
      const migration = require(path.join(migrationsDir, file))
      if (migration.up) {
        await migration.up(client)
        console.log(`Migration ${file} completed.`)
      }
    }
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
