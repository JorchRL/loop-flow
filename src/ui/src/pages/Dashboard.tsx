import { useApi } from '../hooks/useApi'
import { api, type Stats } from '../api/client'
import { Link } from 'react-router-dom'

function StatCard({ label, value, color = 'blue' }: { label: string; value: number | string; color?: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats, loading, error } = useApi<Stats>(() => api.getStats())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading dashboard: {error.message}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your LoopFlow workspace</p>
      </div>

      {/* Task Stats */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Tasks</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats.tasks.total} color="slate" />
          <StatCard label="To Do" value={stats.tasks.todo} color="blue" />
          <StatCard label="In Progress" value={stats.tasks.in_progress} color="yellow" />
          <StatCard label="Done" value={stats.tasks.done} color="green" />
          <StatCard label="Blocked" value={stats.tasks.blocked} color="red" />
        </div>
      </section>

      {/* Insights Stats */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Insights</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard label="Total" value={stats.insights.total} color="slate" />
          {Object.entries(stats.insights.by_type).map(([type, count]) => (
            <StatCard key={type} label={type} value={count} color="blue" />
          ))}
        </div>
      </section>

      {/* Recent Sessions */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-slate-700">Recent Sessions</h2>
          <Link to="/sessions" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {stats.sessions.recent.length === 0 ? (
            <div className="p-4 text-slate-500 text-center">No sessions yet</div>
          ) : (
            stats.sessions.recent.map((session) => (
              <div key={session.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{session.id}</div>
                    <div className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {session.summary}
                    </div>
                  </div>
                  {session.outcome && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      session.outcome === 'COMPLETE' 
                        ? 'bg-green-100 text-green-700'
                        : session.outcome === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {session.outcome}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
