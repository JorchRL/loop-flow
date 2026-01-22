// API client for LoopFlow backend

const API_BASE = '/api'

export interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  depends_on: string[] | null
  acceptance_criteria: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Insight {
  id: string
  content: string
  type: string
  status: string
  tags: string[] | null
  links: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  date: string
  session_number: number
  task_id: string | null
  task_title: string | null
  outcome: string | null
  summary: string
  created_at: string
}

export interface Stats {
  tasks: {
    total: number
    todo: number
    in_progress: number
    done: number
    blocked: number
  }
  insights: {
    total: number
    by_type: Record<string, number>
  }
  sessions: {
    total: number
    recent: Session[]
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export const api = {
  // Stats
  getStats: () => fetchJson<Stats>('/stats'),

  // Tasks
  getTasks: (status?: string) => {
    const params = status ? `?status=${status}` : ''
    return fetchJson<Task[]>(`/tasks${params}`)
  },
  getTask: (id: string) => fetchJson<Task>(`/tasks/${id}`),
  updateTask: async (id: string, updates: Partial<Task>) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return res.json()
  },

  // Insights
  getInsights: (type?: string) => {
    const params = type ? `?type=${type}` : ''
    return fetchJson<Insight[]>(`/insights${params}`)
  },
  getInsight: (id: string) => fetchJson<Insight>(`/insights/${id}`),
  searchInsights: (query: string) => fetchJson<Insight[]>(`/insights/search?q=${encodeURIComponent(query)}`),

  // Sessions
  getSessions: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : ''
    return fetchJson<Session[]>(`/sessions${params}`)
  },
  getSession: (id: string) => fetchJson<Session>(`/sessions/${id}`),
}
