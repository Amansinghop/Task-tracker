import { query, queryOne, UserPublic } from './db'

export interface TaskStatus {
  id: string
  name: string
  color: string
  position: number
  created_at: string
}

export interface TaskTag {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Task {
  id: string
  name: string
  description: string
  status_id: string
  status_name?: string
  status_color?: string
  priority: 'High' | 'Medium' | 'Low'
  start_date: string | null
  due_date: string | null
  deliverable: string
  effort_level: string
  created_by: string
  created_by_name?: string
  last_updated_by: string | null
  last_updated_by_name?: string | null
  created_at: string
  updated_at: string
  assignees: { id: string; name: string; email: string }[]
  tags: { id: string; name: string; color: string }[]
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  user_email: string
  content: string
  created_at: string
  updated_at: string
}

// ----------------------------------------------------
// Status Functions
// ----------------------------------------------------

export async function getAllStatuses(): Promise<TaskStatus[]> {
  try {
    return await query<TaskStatus>(
      `SELECT id::text as id, name, color, position, created_at FROM task_statuses ORDER BY position ASC, name ASC`
    )
  } catch (error) {
    console.error('[v0] getAllStatuses error:', error)
    return []
  }
}

export async function createStatus(name: string, color: string, position: number): Promise<TaskStatus | null> {
  try {
    return await queryOne<TaskStatus>(
      `INSERT INTO task_statuses (name, color, position) VALUES ($1, $2, $3) RETURNING id::text as id, name, color, position, created_at`,
      [name, color, position]
    )
  } catch (error) {
    console.error('[v0] createStatus error:', error)
    return null
  }
}

export async function updateStatus(id: string, name: string, color: string, position: number): Promise<TaskStatus | null> {
  try {
    return await queryOne<TaskStatus>(
      `UPDATE task_statuses SET name = $1, color = $2, position = $3 WHERE id = $4::bigint RETURNING id::text as id, name, color, position, created_at`,
      [name, color, position, id]
    )
  } catch (error) {
    console.error('[v0] updateStatus error:', error)
    return null
  }
}

export async function deleteStatus(id: string): Promise<boolean> {
  try {
    // Check if there are any tasks with this status first
    const check = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tasks WHERE status_id = $1::bigint`,
      [id]
    )
    if (check && parseInt(check.count, 10) > 0) {
      throw new Error('Cannot delete status because it has associated tasks')
    }

    await query(`DELETE FROM task_statuses WHERE id = $1::bigint`, [id])
    return true
  } catch (error) {
    console.error('[v0] deleteStatus error:', error)
    return false
  }
}

// ----------------------------------------------------
// Tag Functions
// ----------------------------------------------------

export async function getAllTags(): Promise<TaskTag[]> {
  try {
    return await query<TaskTag>(
      `SELECT id::text as id, name, color, created_at FROM task_tags ORDER BY name ASC`
    )
  } catch (error) {
    console.error('[v0] getAllTags error:', error)
    return []
  }
}

export async function createTag(name: string, color: string): Promise<TaskTag | null> {
  try {
    return await queryOne<TaskTag>(
      `INSERT INTO task_tags (name, color) VALUES ($1, $2) RETURNING id::text as id, name, color, created_at`,
      [name, color]
    )
  } catch (error) {
    console.error('[v0] createTag error:', error)
    return null
  }
}

export async function deleteTag(id: string): Promise<boolean> {
  try {
    // Delete associations first
    await query(`DELETE FROM task_tag_map WHERE tag_id = $1::bigint`, [id])
    await query(`DELETE FROM task_tags WHERE id = $1::bigint`, [id])
    return true
  } catch (error) {
    console.error('[v0] deleteTag error:', error)
    return false
  }
}

// ----------------------------------------------------
// Member Functions
// ----------------------------------------------------

export async function getApprovedMembers(): Promise<UserPublic[]> {
  try {
    return await query<UserPublic>(
      `SELECT id::text as id, name, email, role, status, created_at FROM users WHERE status = 'approved' ORDER BY name ASC, email ASC`
    )
  } catch (error) {
    console.error('[v0] getApprovedMembers error:', error)
    return []
  }
}

// ----------------------------------------------------
// Task Functions
// ----------------------------------------------------

export async function createTask(data: {
  name: string
  description: string
  status_id: string
  priority: string
  start_date?: string | null
  due_date: string | null
  deliverable?: string
  effort_level?: string
  created_by: string
  assigneeIds: string[]
  tagIds: string[]
}): Promise<string | null> {
  try {
    // Insert task
    const task = await queryOne<{ id: string }>(
      `INSERT INTO tasks (name, description, status_id, priority, start_date, due_date, deliverable, effort_level, created_by, last_updated_by) 
       VALUES ($1, $2, $3::bigint, $4, $5, $6, $7, $8, $9::bigint, $9::bigint) 
       RETURNING id::text as id`,
      [
        data.name, 
        data.description || '', 
        data.status_id, 
        data.priority, 
        data.start_date || null, 
        data.due_date || null, 
        data.deliverable || '', 
        data.effort_level || '', 
        data.created_by
      ]
    )

    if (!task) return null

    const taskId = task.id

    // Insert assignees
    if (data.assigneeIds && data.assigneeIds.length > 0) {
      const assigneePlaceholders = data.assigneeIds.map((_, i) => `($1::bigint, $${i + 2}::bigint)`).join(',')
      await query(
        `INSERT INTO task_assignees (task_id, user_id) VALUES ${assigneePlaceholders}`,
        [taskId, ...data.assigneeIds]
      )
    }

    // Insert tags
    if (data.tagIds && data.tagIds.length > 0) {
      const tagPlaceholders = data.tagIds.map((_, i) => `($1::bigint, $${i + 2}::bigint)`).join(',')
      await query(
        `INSERT INTO task_tag_map (task_id, tag_id) VALUES ${tagPlaceholders}`,
        [taskId, ...data.tagIds]
      )
    }

    return taskId
  } catch (error) {
    console.error('[v0] createTask error:', error)
    return null
  }
}

export async function getTask(id: string): Promise<Task | null> {
  try {
    const task = await queryOne<any>(
      `SELECT 
        t.id::text as id, 
        t.name, 
        t.description, 
        t.status_id::text as status_id, 
        ts.name as status_name, 
        ts.color as status_color, 
        t.priority, 
        t.start_date::text as start_date,
        t.due_date::text as due_date, 
        t.deliverable,
        t.effort_level,
        t.created_by::text as created_by, 
        u1.name as created_by_name, 
        t.last_updated_by::text as last_updated_by, 
        u2.name as last_updated_by_name, 
        t.created_at, 
        t.updated_at
       FROM tasks t
       LEFT JOIN task_statuses ts ON t.status_id = ts.id
       LEFT JOIN users u1 ON t.created_by = u1.id
       LEFT JOIN users u2 ON t.last_updated_by = u2.id
       WHERE t.id = $1::bigint`,
      [id]
    )

    if (!task) return null

    // Fetch assignees
    const assignees = await query<any>(
      `SELECT u.id::text as id, u.name, u.email 
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = $1::bigint`,
      [id]
    )

    // Fetch tags
    const tags = await query<any>(
      `SELECT tag.id::text as id, tag.name, tag.color 
       FROM task_tag_map ttm
       JOIN task_tags tag ON ttm.tag_id = tag.id
       WHERE ttm.task_id = $1::bigint`,
      [id]
    )

    return {
      ...task,
      assignees,
      tags
    } as Task
  } catch (error) {
    console.error('[v0] getTask error:', error)
    return null
  }
}

export async function getAllTasks(filters: {
  status?: string
  priority?: string
  assignee?: string
  tag?: string
  search?: string
  mine?: boolean
  userId?: string
}): Promise<any[]> {
  try {
    let sql = `
      SELECT DISTINCT
        t.id::text as id, 
        t.name, 
        t.description, 
        t.status_id::text as status_id, 
        ts.name as status_name, 
        ts.color as status_color, 
        t.priority, 
        t.start_date::text as start_date,
        t.due_date::text as due_date, 
        t.deliverable,
        t.effort_level,
        t.created_by::text as created_by, 
        u1.name as created_by_name, 
        t.last_updated_by::text as last_updated_by, 
        u2.name as last_updated_by_name, 
        t.created_at, 
        t.updated_at
      FROM tasks t
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.last_updated_by = u2.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN task_tag_map ttm ON t.id = ttm.task_id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.status) {
      params.push(filters.status)
      sql += ` AND t.status_id = $${params.length}::bigint`
    }

    if (filters.priority) {
      params.push(filters.priority)
      sql += ` AND t.priority = $${params.length}`
    }

    if (filters.assignee) {
      params.push(filters.assignee)
      sql += ` AND ta.user_id = $${params.length}::bigint`
    }

    if (filters.tag) {
      params.push(filters.tag)
      sql += ` AND ttm.tag_id = $${params.length}::bigint`
    }

    if (filters.search) {
      params.push(`%${filters.search}%`)
      sql += ` AND (t.name ILIKE $${params.length} OR t.description ILIKE $${params.length})`
    }

    if (filters.mine && filters.userId) {
      params.push(filters.userId)
      sql += ` AND ta.user_id = $${params.length}::bigint`
    }

    sql += ` ORDER BY t.created_at DESC`

    const tasks = await query<any>(sql, params)
    if (tasks.length === 0) return []

    const taskIds = tasks.map((t) => t.id)

    // Map through tasks and query assignees and tags for returned tasks only
    const allAssignees = await query<any>(
      `SELECT ta.task_id::text as task_id, u.id::text as id, u.name, u.email 
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ANY($1::bigint[])`,
      [taskIds]
    )

    const allTags = await query<any>(
      `SELECT ttm.task_id::text as task_id, tag.id::text as id, tag.name, tag.color 
       FROM task_tag_map ttm
       JOIN task_tags tag ON ttm.tag_id = tag.id
       WHERE ttm.task_id = ANY($1::bigint[])`,
      [taskIds]
    )

    return tasks.map((task) => ({
      ...task,
      assignees: allAssignees.filter((a) => a.task_id === task.id).map(({ task_id, ...rest }) => rest),
      tags: allTags.filter((t) => t.task_id === task.id).map(({ task_id, ...rest }) => rest)
    }))
  } catch (error) {
    console.error('[v0] getAllTasks error:', error)
    return []
  }
}

export async function updateTask(
  id: string,
  data: Partial<{
    name: string
    description: string
    status_id: string
    priority: string
    start_date: string | null
    due_date: string | null
    deliverable: string
    effort_level: string
    last_updated_by: string
    assigneeIds: string[]
    tagIds: string[]
  }>
): Promise<boolean> {
  try {
    const updateFields: string[] = []
    const params: any[] = []

    if (data.name !== undefined) {
      params.push(data.name)
      updateFields.push(`name = $${params.length}`)
    }
    if (data.description !== undefined) {
      params.push(data.description)
      updateFields.push(`description = $${params.length}`)
    }
    if (data.status_id !== undefined) {
      params.push(data.status_id)
      updateFields.push(`status_id = $${params.length}::bigint`)
    }
    if (data.priority !== undefined) {
      params.push(data.priority)
      updateFields.push(`priority = $${params.length}`)
    }
    if (data.start_date !== undefined) {
      params.push(data.start_date)
      updateFields.push(`start_date = $${params.length}`)
    }
    if (data.due_date !== undefined) {
      params.push(data.due_date)
      updateFields.push(`due_date = $${params.length}`)
    }
    if (data.deliverable !== undefined) {
      params.push(data.deliverable)
      updateFields.push(`deliverable = $${params.length}`)
    }
    if (data.effort_level !== undefined) {
      params.push(data.effort_level)
      updateFields.push(`effort_level = $${params.length}`)
    }
    if (data.last_updated_by !== undefined) {
      params.push(data.last_updated_by)
      updateFields.push(`last_updated_by = $${params.length}::bigint`)
    }

    const promises: Promise<any>[] = []

    if (updateFields.length > 0) {
      params.push(id)
      updateFields.push(`updated_at = NOW()`)
      promises.push(query(
        `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${params.length}::bigint`,
        params
      ))
    }

    // Update assignees if provided
    if (data.assigneeIds !== undefined) {
      promises.push((async () => {
        await query(`DELETE FROM task_assignees WHERE task_id = $1::bigint`, [id])
        if (data.assigneeIds.length > 0) {
          const assigneePlaceholders = data.assigneeIds.map((_, i) => `($1::bigint, $${i + 2}::bigint)`).join(',')
          await query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ${assigneePlaceholders}`,
            [id, ...data.assigneeIds]
          )
        }
      })())
    }

    // Update tags if provided
    if (data.tagIds !== undefined) {
      promises.push((async () => {
        await query(`DELETE FROM task_tag_map WHERE task_id = $1::bigint`, [id])
        if (data.tagIds.length > 0) {
          const tagPlaceholders = data.tagIds.map((_, i) => `($1::bigint, $${i + 2}::bigint)`).join(',')
          await query(
            `INSERT INTO task_tag_map (task_id, tag_id) VALUES ${tagPlaceholders}`,
            [id, ...data.tagIds]
          )
        }
      })())
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }

    return true
  } catch (error) {
    console.error('[v0] updateTask error:', error)
    return false
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    // Cascading deletes handled by foreign keys
    await query(`DELETE FROM tasks WHERE id = $1::bigint`, [id])
    return true
  } catch (error) {
    console.error('[v0] deleteTask error:', error)
    return false
  }
}

// ----------------------------------------------------
// Comment Functions
// ----------------------------------------------------

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  try {
    return await query<TaskComment>(
      `SELECT 
        c.id::text as id, 
        c.task_id::text as task_id, 
        c.user_id::text as user_id, 
        u.name as user_name, 
        u.email as user_email, 
        c.content, 
        c.created_at, 
        c.updated_at
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1::bigint
       ORDER BY c.created_at ASC`,
      [taskId]
    )
  } catch (error) {
    console.error('[v0] getTaskComments error:', error)
    return []
  }
}

export async function createTaskComment(taskId: string, userId: string, content: string): Promise<TaskComment | null> {
  try {
    const comment = await queryOne<{ id: string }>(
      `INSERT INTO task_comments (task_id, user_id, content) 
       VALUES ($1::bigint, $2::bigint, $3) 
       RETURNING id::text as id`,
      [taskId, userId, content]
    )

    if (!comment) return null

    return await queryOne<TaskComment>(
      `SELECT 
        c.id::text as id, 
        c.task_id::text as task_id, 
        c.user_id::text as user_id, 
        u.name as user_name, 
        u.email as user_email, 
        c.content, 
        c.created_at, 
        c.updated_at
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1::bigint`,
      [comment.id]
    )
  } catch (error) {
    console.error('[v0] createTaskComment error:', error)
    return null
  }
}
