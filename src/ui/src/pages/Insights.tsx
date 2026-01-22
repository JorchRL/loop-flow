import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api, type Insight } from '../api/client'

const typeConfig: Record<string, { color: string; bgColor: string }> = {
  process: { color: 'text-purple-700', bgColor: 'bg-purple-100' },
  domain: { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  architecture: { color: 'text-green-700', bgColor: 'bg-green-100' },
  edge_case: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  technical: { color: 'text-slate-700', bgColor: 'bg-slate-100' },
}

function InsightCard({ insight, onClick }: { insight: Insight; onClick: () => void }) {
  const config = typeConfig[insight.type] || typeConfig.technical
  return (
    <div 
      className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-slate-400">{insight.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
          {insight.type}
        </span>
      </div>
      <p className="text-slate-700 mt-2 line-clamp-3">{insight.content}</p>
      {insight.tags && insight.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {insight.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {tag}
            </span>
          ))}
          {insight.tags.length > 4 && (
            <span className="text-xs text-slate-400">+{insight.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  )
}

function InsightModal({ insight, onClose }: { insight: Insight; onClose: () => void }) {
  const config = typeConfig[insight.type] || typeConfig.technical
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-mono text-slate-400">{insight.id}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                {insight.type}
              </span>
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

          <p className="text-slate-700 mt-4 whitespace-pre-wrap">{insight.content}</p>

          {insight.tags && insight.tags.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Tags</h3>
              <div className="flex flex-wrap gap-1 mt-2">
                {insight.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insight.links && insight.links.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Linked Insights</h3>
              <div className="flex flex-wrap gap-1 mt-2">
                {insight.links.map(link => (
                  <span key={link} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded font-mono">
                    {link}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insight.notes && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
              <p className="text-slate-600 mt-1 whitespace-pre-wrap text-sm">{insight.notes}</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
            Created: {new Date(insight.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Insights() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  
  const { data: insights, loading, error } = useApi<Insight[]>(
    () => search ? api.searchInsights(search) : api.getInsights(typeFilter || undefined),
    [search, typeFilter]
  )

  const types = ['process', 'domain', 'architecture', 'edge_case', 'technical']

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
        Error loading insights: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Insights</h1>
        <p className="text-slate-500 mt-1">
          {insights?.length || 0} insights captured
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search insights..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All types</option>
          {types.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(insights || []).map(insight => (
          <InsightCard 
            key={insight.id} 
            insight={insight} 
            onClick={() => setSelectedInsight(insight)} 
          />
        ))}
        {insights?.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8">
            No insights found
          </div>
        )}
      </div>

      {selectedInsight && (
        <InsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
      )}
    </div>
  )
}
