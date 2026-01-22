import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api, type Session } from '../api/client'

const outcomeConfig: Record<string, { color: string; bgColor: string }> = {
  COMPLETE: { color: 'text-green-700', bgColor: 'bg-green-100' },
  IN_PROGRESS: { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  BLOCKED: { color: 'text-red-700', bgColor: 'bg-red-100' },
}

function SessionCard({ session, onClick }: { session: Session; onClick: () => void }) {
  const config = outcomeConfig[session.outcome || ''] || { color: 'text-slate-700', bgColor: 'bg-slate-100' }
  
  return (
    <div 
      className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-sm font-mono font-medium text-slate-700">{session.id}</span>
          <span className="text-sm text-slate-400 ml-2">
            {new Date(session.date).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        </div>
        {session.outcome && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
            {session.outcome}
          </span>
        )}
      </div>
      {session.task_title && (
        <div className="mt-2 text-sm text-slate-600">
          <span className="font-medium">Task:</span> {session.task_title}
        </div>
      )}
      <p className="text-slate-700 mt-2 line-clamp-3 text-sm">{session.summary}</p>
    </div>
  )
}

function SessionModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const config = outcomeConfig[session.outcome || ''] || { color: 'text-slate-700', bgColor: 'bg-slate-100' }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-lg font-mono font-semibold text-slate-800">{session.id}</span>
              {session.outcome && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                  {session.outcome}
                </span>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-sm text-slate-500 mt-1">
            {new Date(session.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric',
              month: 'long', 
              day: 'numeric' 
            })}
          </div>

          {session.task_id && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Task</div>
              <div className="font-medium text-slate-800 mt-1">
                <span className="font-mono text-slate-500">{session.task_id}</span>
                {session.task_title && <span className="ml-2">{session.task_title}</span>}
              </div>
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
            <p className="text-slate-700 mt-2 whitespace-pre-wrap">{session.summary}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
            Session #{session.session_number} on {session.date}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Sessions() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const { data: sessions, loading, error } = useApi<Session[]>(() => api.getSessions(50))

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
        Error loading sessions: {error.message}
      </div>
    )
  }

  // Group sessions by date
  const sessionsByDate = (sessions || []).reduce((acc, session) => {
    const date = session.date
    if (!acc[date]) acc[date] = []
    acc[date].push(session)
    return acc
  }, {} as Record<string, Session[]>)

  const sortedDates = Object.keys(sessionsByDate).sort().reverse()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sessions</h1>
        <p className="text-slate-500 mt-1">
          {sessions?.length || 0} sessions recorded
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {sortedDates.map(date => (
          <div key={date}>
            <div className="sticky top-14 bg-slate-50/95 backdrop-blur py-2 z-10">
              <h2 className="text-sm font-semibold text-slate-600">
                {new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
            </div>
            <div className="space-y-3 mt-3">
              {sessionsByDate[date].map(session => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                  onClick={() => setSelectedSession(session)} 
                />
              ))}
            </div>
          </div>
        ))}
        {sortedDates.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            No sessions recorded yet
          </div>
        )}
      </div>

      {selectedSession && (
        <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  )
}
