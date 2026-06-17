import pg from "pg"
import { readFileSync } from "fs"
import { join } from "path"

async function runMigration() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL environment variable is not set.")
    console.error("Set it to your PostgreSQL connection string, e.g.:")
    console.error("  DATABASE_URL=postgresql://user:password@host:5432/dbname")
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  })

  try {
    await client.connect()
    console.log("Connected to PostgreSQL.")

    const sqlPath = join(process.cwd(), "scripts", "001-create-users-table.sql")
    const sql = readFileSync(sqlPath, "utf-8")

    await client.query(sql)
    console.log("Migration executed successfully: 001-create-users-table.sql")

    const result = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    )
    console.log("Users table schema:")
    result.rows.forEach((row) => {
      console.log(`  ${row.column_name}: ${row.data_type}`)
    })
  } catch (err) {
    console.error("Migration failed:", err)
    process.exit(1)
  } finally {
    await client.end()
    console.log("Connection closed.")
  }
}

runMigration()
