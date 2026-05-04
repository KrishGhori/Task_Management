import './App.css'
import AppHeader from './components/AppHeader'
import AuthScreen from './components/AuthScreen'
import DashboardScreen from './components/DashboardScreen'
import LandingScreen from './components/LandingScreen'
import useTaskManagementApp from './hooks/useTaskManagementApp'

function App() {
  const app = useTaskManagementApp()

  return (
    <main className="app-shell">
      <AppHeader />

      {!app.token || !app.user ? (
        app.showHomePage ? (
          <LandingScreen app={app} />
        ) : (
          <AuthScreen app={app} />
        )
      ) : (
        <DashboardScreen app={app} />
      )}

      {app.message && (!app.token || !app.user) ? <p className="message">{app.message}</p> : null}
    </main>
  )
}

export default App
