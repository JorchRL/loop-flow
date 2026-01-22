import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api, type Task } from '../api/client'

type StatusColumn = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'

const statusConfig: Record<StatusColumn, { label: string; color: string; bgColor: string }> = {
  TODO: { label: 'To Do', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  DONE: { label: 'Done', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  BLOCKED: { label: 'Blocked', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
}

const priorityBadge: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-600',
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div 
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-slate-400">{task.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityBadge[task.priority] || priorityBadge.medium}`}>
          {task.priority}
        </span>
      </div>
      <h3 className="font-medium text-slate-800 mt-2 text-sm leading-tight">
        {task.title.replace(/^\[(IMPL|SPIKE|DESIGN|LEARN|REVIEW|BUG|DOCS)\]\s*/, '')}
      </h3>
      {task.description && (
        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{task.description}</p>
      )}
    </div>
  )
}

function TaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-mono text-slate-400">{task.id}</span>
              <h2 className="text-xl font-bold text-slate-800 mt-1">{task.title}</h2>
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

          <div className="flex gap-2 mt-4">
            <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[task.status as StatusColumn]?.bgColor || 'bg-slate-100'}`}>
              {task.status}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${priorityBadge[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          {task.description && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Description</h3>
              <p className="text-slate-600 mt-1 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Acceptance Criteria</h3>
              <ul className="mt-2 space-y-1">
                {task.acceptance_criteria.map((criterion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-slate-400">-</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.notes && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
              <p className="text-slate-600 mt-1 whitespace-pre-wrap text-sm">{task.notes}</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
            Created: {new Date(task.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Backlog() {
  const { data: tasks, loading, error } = useApi<Task[]>(() => api.getTasks())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

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
        Error loading backlog: {error.message}
      </div>
    )
  }

  const columns: StatusColumn[] = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']
  const tasksByStatus = columns.reduce((acc, status) => {
    acc[status] = (tasks || []).filter(t => t.status === status)
    return acc
  }, {} as Record<StatusColumn, Task[]>)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Backlog</h1>
        <p className="text-slate-500 mt-1">
          {tasks?.length || 0} tasks across {columns.length} columns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(status => (
          <div key={status} className={`rounded-lg border p-3 ${statusConfig[status].bgColor}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`font-semibold ${statusConfig[status].color}`}>
                {statusConfig[status].label}
              </h2>
              <span className={`text-sm ${statusConfig[status].color} opacity-70`}>
                {tasksByStatus[status].length}
              </span>
            </div>
            <div className="space-y-2">
              {tasksByStatus[status].map(task => (
                <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
              {tasksByStatus[status].length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4">No tasks</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}
