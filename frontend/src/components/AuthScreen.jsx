const AuthScreen = ({ app }) => (
  <section className="card auth-card">
    <h2>{app.authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
    {app.authMode === 'login' ? (
      <p className="home-subtitle">Admins log in directly. Employees receive OTP on email.</p>
    ) : (
      <p className="home-subtitle">Registration creates employee accounts only.</p>
    )}
    <form className="auth-form" onSubmit={app.onAuthSubmit}>
      {app.authMode === 'register' ? (
        <input
          type="text"
          placeholder="Name"
          value={app.authName}
          onChange={(event) => app.setAuthName(event.target.value)}
          required
        />
      ) : null}
      <input
        type="email"
        placeholder="Email"
        value={app.authEmail}
        onChange={(event) => app.setAuthEmail(event.target.value)}
        required
        disabled={app.authMode === 'login' && Boolean(app.authChallengeId)}
      />
      <input
        type="password"
        placeholder="Password"
        value={app.authPassword}
        onChange={(event) => app.setAuthPassword(event.target.value)}
        required
        minLength={6}
        disabled={app.authMode === 'login' && Boolean(app.authChallengeId)}
      />

      {app.authMode === 'login' && app.authChallengeId ? (
        <>
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={app.authOtp}
            onChange={(event) => app.setAuthOtp(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />
          <button
            type="button"
            className="ghost"
            onClick={() => {
              app.resetOtpFlow()
              app.setMessage('Enter credentials to request a new OTP.')
            }}
            disabled={app.authLoading}
          >
            Change Credentials
          </button>
        </>
      ) : null}

      <button type="submit" disabled={app.authLoading}>
        {app.authLoading
          ? 'Please wait...'
          : app.authMode === 'login'
            ? app.authChallengeId
              ? 'Verify OTP'
              : 'Send OTP'
            : 'Create Account'}
      </button>
    </form>
    <button
      type="button"
      className="switch-auth"
      onClick={() => {
        app.setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))
        app.resetOtpFlow()
        app.setAuthPassword('')
        app.setMessage('')
      }}
    >
      {app.authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
    </button>
  </section>
)

export default AuthScreen