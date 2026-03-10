import { useEffect } from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import ImportPage from './pages/ImportPage.jsx'
import StudyPage from './pages/StudyPage.jsx'
import StatsPage from './pages/StatsPage.jsx'
import { initializeStorage, saveLastVisitedPage } from './utils/storage.js'

function AppLayout() {
  const location = useLocation()

  useEffect(() => {
    initializeStorage()
    saveLastVisitedPage(location.pathname)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <nav className="nav">
        <NavLink to="/" className="nav-link">
          首页
        </NavLink>
        <NavLink to="/import" className="nav-link">
          导入页
        </NavLink>
        <NavLink to="/study" className="nav-link">
          学习页
        </NavLink>
        <NavLink to="/stats" className="nav-link">
          统计页
        </NavLink>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
