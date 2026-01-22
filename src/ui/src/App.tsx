import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Backlog from './pages/Backlog'
import Insights from './pages/Insights'
import Sessions from './pages/Sessions'

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <svg className="w-7 h-7 text-blue-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8">
                  <circle cx="50" cy="50" r="42"/>
                  <path d="M30 50 L45 65 L70 35" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-semibold text-lg text-slate-800">LoopFlow</span>
              </div>
              <div className="flex space-x-1">
                <NavLink 
                  to="/" 
                  end
                  className={({ isActive }) => 
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink 
                  to="/backlog" 
                  className={({ isActive }) => 
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  Backlog
                </NavLink>
                <NavLink 
                  to="/insights" 
                  className={({ isActive }) => 
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  Insights
                </NavLink>
                <NavLink 
                  to="/sessions" 
                  className={({ isActive }) => 
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  Sessions
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/sessions" element={<Sessions />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
