import { Pool, QueryResult } from 'pg'
import dns from 'dns'

// Force IPv4 DNS resolution — DigitalOcean managed databases are IPv4-only
dns.setDefaultResultOrder('ipv4first')

const globalForDb = global as unknown as { 
  pgPool?: Pool
  pgPoolUrl?: string
  dbInitialized?: boolean 
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL not set')
  }

  const cleanUrl = connectionString.replace(/[?&](sslmode|ssl)=[^&]*/g, '').replace(/[?&]+$/, '')

  // Recreate pool if it doesn't exist or if the URL changed
  if (!globalForDb.pgPool || globalForDb.pgPoolUrl !== cleanUrl) {
    // Destroy old pool if it exists
    if (globalForDb.pgPool) {
      globalForDb.pgPool.end().catch(() => {})
      globalForDb.pgPool = undefined
      globalForDb.dbInitialized = false
    }

    globalForDb.pgPool = new Pool({
      connectionString: cleanUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
      ssl: { rejectUnauthorized: false },
    })
    globalForDb.pgPoolUrl = cleanUrl

    globalForDb.pgPool.on('error', (err) => {
      console.error('[v0] Pool error:', err)
    })
    console.log('[v0] Database pool created')
  }
  return globalForDb.pgPool
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  try {
    const pool = getPool()
    const result = await pool.query(text, params)
    return result.rows as T[]
  } catch (error) {
    console.error('[v0] Query error:', error)
    throw error
  }
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  try {
    const pool = getPool()
    const result = await pool.query(text, params)
    return (result.rows[0] as T) || null
  } catch (error) {
    console.error('[v0] Query error:', error)
    throw error
  }
}

let dbInitPromise: Promise<void> | null = null

export async function ensureDbInitialized(): Promise<void> {
  if (!globalForDb.dbInitialized) {
    if (!dbInitPromise) {
      dbInitPromise = initializeDatabase()
        .then(() => {
          globalForDb.dbInitialized = true
          dbInitPromise = null
        })
        .catch((err) => {
          console.error('[v0] Init error:', err)
          dbInitPromise = null
          // Reset pool so next request creates a fresh connection
          if (globalForDb.pgPool) {
            globalForDb.pgPool.end().catch(() => {})
            globalForDb.pgPool = undefined
            globalForDb.pgPoolUrl = undefined
          }
        })
    }
    await dbInitPromise
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL DEFAULT '',
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        license_start DATE NOT NULL,
        license_end DATE NOT NULL,
        max_daily_hours INT DEFAULT 24,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        login_time TIMESTAMP NOT NULL DEFAULT NOW(),
        last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS session_usage (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        hours_used DECIMAL(5,2) DEFAULT 0,
        UNIQUE(user_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON user_sessions(device_fingerprint);
      CREATE INDEX IF NOT EXISTS idx_usage_user_date ON session_usage(user_id, date);

      CREATE TABLE IF NOT EXISTS task_statuses (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
        position INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_tags (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(7) NOT NULL DEFAULT '#8b5cf6',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        status_id BIGINT NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
        priority VARCHAR(10) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
        start_date DATE,
        due_date DATE,
        deliverable VARCHAR(512) DEFAULT '',
        effort_level VARCHAR(20) DEFAULT '',
        created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

      CREATE TABLE IF NOT EXISTS task_assignees (
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (task_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

      CREATE TABLE IF NOT EXISTS task_tag_map (
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id BIGINT NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS task_comments (
        id BIGSERIAL PRIMARY KEY,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
    `)

    // Seed default task statuses if table is empty
    const statusCount = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM task_statuses`)
    if (statusCount && parseInt(statusCount.count, 10) === 0) {
      await query(`
        INSERT INTO task_statuses (name, color, position) VALUES
          ('Todo', '#6b7280', 0),
          ('In Progress', '#3b82f6', 1),
          ('Done', '#22c55e', 2)
      `)
    }

    // Seed default task tags if table is empty
    const tagCount = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM task_tags`)
    if (tagCount && parseInt(tagCount.count, 10) === 0) {
      await query(`
        INSERT INTO task_tags (name, color) VALUES
          ('Bug', '#ef4444'),
          ('Feature Request', '#3b82f6'),
          ('Meeting', '#f59e0b'),
          ('Documentation', '#8b5cf6'),
          ('Design', '#ec4899'),
          ('Research', '#06b6d4')
      `)
    }
    
    try {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS max_daily_hours INT DEFAULT 24`)
    } catch (err) {
      // Column might exist
    }
    
    console.log('[v0] Database initialized')
  } catch (error) {
    console.error('[v0] Init failed:', error)
    throw error
  }
}

// Types
export interface User {
  id: string
  name: string
  email: string
  password_hash: string
  license_start: string
  license_end: string
  max_daily_hours: number
  role: 'user' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface UserPublic {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  license_start?: string
  license_end?: string
  max_daily_hours?: number
}

// User functions
export async function getUser(email: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id::text as id, name, email, password_hash, license_start, license_end, max_daily_hours, role, status, created_at, updated_at FROM users WHERE email = $1`,
    [email]
  )
}

export async function getUserById(id: string): Promise<UserPublic | null> {
  return queryOne<UserPublic>(
    `SELECT id::text as id, name, email, role, status, created_at, license_start, license_end FROM users WHERE id = $1::bigint`,
    [id]
  )
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
  licenseStart: string,
  licenseEnd: string
): Promise<User | null> {
  return queryOne<User>(
    `INSERT INTO users (name, email, password_hash, license_start, license_end) VALUES ($1, $2, $3, $4, $5) RETURNING id::text as id, name, email, password_hash, license_start, license_end, max_daily_hours, role, status, created_at, updated_at`,
    [name, email, passwordHash, licenseStart, licenseEnd]
  )
}

export async function getAllUsers(): Promise<UserPublic[]> {
  return query<UserPublic>(
    `SELECT id::text as id, name, email, role, status, created_at, license_start, license_end, max_daily_hours FROM users ORDER BY created_at DESC`
  )
}

export async function updateUserStatus(
  userId: string,
  status: string
): Promise<User | null> {
  try {
    const result = await queryOne<User>(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2::bigint RETURNING id::text as id, name, email, password_hash, license_start, license_end, max_daily_hours, role, status, created_at, updated_at`,
      [status, userId]
    )
    return result || null
  } catch (error) {
    console.error('[v0] Update status error:', error)
    return null
  }
}

export async function updateUserDailyHours(
  userId: string,
  maxDailyHours: number
): Promise<User | null> {
  try {
    console.log('[v0] updateUserDailyHours called with:', { userId, maxDailyHours });
    const result = await queryOne<User>(
      `UPDATE users SET max_daily_hours = $1, updated_at = NOW() WHERE id = $2::bigint RETURNING id::text as id, name, email, password_hash, license_start, license_end, max_daily_hours, role, status, created_at, updated_at`,
      [maxDailyHours, userId]
    )
    console.log('[v0] updateUserDailyHours result:', result);
    return result || null
  } catch (error) {
    console.error('[v0] Update daily hours error:', error)
    return null
  }
}

export async function createBulkUsers(
  users: Array<{ name: string; email: string; passwordHash: string; licenseStart: string; licenseEnd: string; status?: string; maxDailyHours?: number }>
): Promise<User[]> {
  const placeholders = users
    .map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`)
    .join(',')

  const params = users.flatMap((u) => [
    u.name,
    u.email,
    u.passwordHash,
    u.licenseStart,
    u.licenseEnd,
    u.status || 'approved',
    u.maxDailyHours || 24,
  ])

  return query<User>(
    `INSERT INTO users (name, email, password_hash, license_start, license_end, status, max_daily_hours) VALUES ${placeholders} RETURNING id::text as id, name, email, password_hash, license_start, license_end, max_daily_hours, role, status, created_at, updated_at`,
    params
  )
}

export async function countUsers(): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM users`
  )
  return result ? parseInt(result.count, 10) : 0
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await query(`DELETE FROM users WHERE id = $1::bigint`, [id])
    return true
  } catch (error) {
    console.error('[v0] Delete error:', error)
    return false
  }
}

// Session functions
export async function createUserSession(
  userId: string,
  deviceFingerprint: string,
  tokenHash: string,
  ipAddress: string,
  userAgent: string
): Promise<string | null> {
  const result = await queryOne<{ id: string }>(
    `INSERT INTO user_sessions (user_id, device_fingerprint, token_hash, ip_address, user_agent) VALUES ($1::bigint, $2, $3, $4, $5) RETURNING id::text as id`,
    [userId, deviceFingerprint, tokenHash, ipAddress, userAgent]
  )
  return result?.id ?? null
}

export async function getActiveSession(userId: string, deviceFingerprint: string): Promise<any> {
  return queryOne(
    `SELECT * FROM user_sessions WHERE user_id = $1::bigint AND device_fingerprint = $2 AND is_active = TRUE`,
    [userId, deviceFingerprint]
  )
}

export async function getAllActiveSessions(userId: string): Promise<any[]> {
  return query(
    `SELECT id::text as id, device_fingerprint, login_time, ip_address FROM user_sessions WHERE user_id = $1::bigint AND is_active = TRUE ORDER BY login_time DESC`,
    [userId]
  )
}

export async function invalidateOtherSessions(
  userId: string,
  currentDeviceFingerprint: string
): Promise<void> {
  try {
    await query(
      `UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1::bigint AND device_fingerprint != $2`,
      [userId, currentDeviceFingerprint]
    )
  } catch (error) {
    console.error('[v0] Invalidate error:', error)
  }
}

export async function deleteSession(userId: string, deviceFingerprint: string): Promise<void> {
  try {
    await query(
      `DELETE FROM user_sessions WHERE user_id = $1::bigint AND device_fingerprint = $2`,
      [userId, deviceFingerprint]
    )
  } catch (error) {
    console.error('[v0] Delete session error:', error)
  }
}

export async function deleteOtherSessions(userId: string, currentDeviceFingerprint: string): Promise<void> {
  try {
    await query(
      `DELETE FROM user_sessions WHERE user_id = $1::bigint AND device_fingerprint != $2`,
      [userId, currentDeviceFingerprint]
    )
  } catch (error) {
    console.error('[v0] Delete other sessions error:', error)
  }
}

export async function invalidateSession(userId: string, deviceFingerprint: string): Promise<void> {
  try {
    await query(
      `UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1::bigint AND device_fingerprint = $2`,
      [userId, deviceFingerprint]
    )
  } catch (error) {
    console.error('[v0] Invalidate error:', error)
  }
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
  try {
    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2::bigint`, [
      passwordHash,
      userId,
    ])
    return true
  } catch (error) {
    console.error('[v0] Password update error:', error)
    return false
  }
}

// Daily hours functions
export async function getDailyUsageHours(userId: string, date?: string): Promise<number> {
  try {
    const checkDate = date || 'CURRENT_DATE'
    const result = await queryOne<{ hours_used: string }>(
      `SELECT COALESCE(hours_used, 0)::decimal as hours_used FROM session_usage WHERE user_id = $1::bigint AND date = ${checkDate}`,
      [userId]
    )
    return result ? parseFloat(result.hours_used) : 0
  } catch (error) {
    console.error('[v0] Get hours error:', error)
    return 0
  }
}

export async function getUserDailyLimit(userId: string): Promise<number> {
  try {
    const result = await queryOne<{ max_daily_hours: number }>(
      `SELECT max_daily_hours FROM users WHERE id = $1::bigint`,
      [userId]
    )
    return result?.max_daily_hours ?? 24
  } catch (error) {
    console.error('[v0] Get limit error:', error)
    return 24
  }
}

export async function canUserLogin(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const dailyUsed = await getDailyUsageHours(userId)
    const dailyLimit = await getUserDailyLimit(userId)

    if (dailyUsed >= dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit reached. Used ${dailyUsed.toFixed(2)} of ${dailyLimit} hours.`,
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('[v0] Login check error:', error)
    return { allowed: true }
  }
}

export async function addSessionTime(userId: string, hours: number, date?: string): Promise<void> {
  try {
    const checkDate = date || 'CURRENT_DATE'
    await query(
      `INSERT INTO session_usage (user_id, date, hours_used) VALUES ($1::bigint, ${checkDate}, $2) ON CONFLICT (user_id, date) DO UPDATE SET hours_used = session_usage.hours_used + $2`,
      [userId, hours]
    )
  } catch (error) {
    console.error('[v0] Add time error:', error)
  }
}

export async function getLastSessionTime(
  userId: string,
  deviceFingerprint: string
): Promise<Date | null> {
  try {
    const result = await queryOne<{ login_time: string }>(
      `SELECT login_time FROM user_sessions WHERE user_id = $1::bigint AND device_fingerprint = $2 AND is_active = TRUE ORDER BY login_time DESC LIMIT 1`,
      [userId, deviceFingerprint]
    )
    return result ? new Date(result.login_time) : null
  } catch (error) {
    console.error('[v0] Get time error:', error)
    return null
  }
}
