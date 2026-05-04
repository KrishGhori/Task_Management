const LandingScreen = ({ app }) => (
  <section className="card home-card">
    <h2>Organize everything with calm focus</h2>
    <p className="home-subtitle">
      Start simple, then scale into collaborative task execution with deadlines, priorities, and assignment.
    </p>

    <div className="home-actions">
      <button
        type="button"
        className="primary"
        onClick={() => {
          app.setShowHomePage(false)
          app.setAuthMode('login')
          app.resetOtpFlow()
          app.setAuthPassword('')
          app.setMessage('')
        }}
      >
        Get Started
      </button>
      <button
        type="button"
        className="ghost"
        onClick={() => {
          app.setShowHomePage(false)
          app.setAuthMode('register')
          app.resetOtpFlow()
          app.setAuthPassword('')
          app.setMessage('')
        }}
      >
        Create Account
      </button>
    </div>
  </section>
)

export default LandingScreen