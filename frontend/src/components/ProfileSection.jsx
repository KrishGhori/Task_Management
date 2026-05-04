import { formatDueDate, formatStatus } from '../utils/taskHelpers'

const ProfileSection = ({ app }) => (
  <section className="profile-view" aria-label="Profile page">
    <header className="profile-header">
      <div className="profile-avatar" aria-hidden="true">
        {app.userInitial}
      </div>
      <div>
        <h2>{app.user.name}</h2>
        <p>{app.user.email}</p>
        <p>Role: {app.formatRole(app.user.role)}</p>
      </div>
    </header>

    <div className="profile-stats">
      <article>
        <h3>Total Tasks</h3>
        <p>{app.tasks.length}</p>
      </article>
      <article>
        <h3>Completed</h3>
        <p>{app.completedCount}</p>
      </article>
      <article>
        <h3>Assigned To You</h3>
        <p>{app.assignedCount}</p>
      </article>
      <article>
        <h3>Completion Rate</h3>
        <p>{app.completionRate}%</p>
      </article>
    </div>

    <div className="profile-grid">
      <article className="profile-panel">
        <h3>Account Summary</h3>
        <p>You are actively collaborating with your team across all priorities.</p>
        <ul>
          <li>Due today: {app.dueTodayCount}</li>
          <li>Overdue: {app.overdueCount}</li>
          <li>In progress: {app.tasks.filter((task) => task.status === 'in_progress').length}</li>
          <li>Pending: {app.tasks.filter((task) => task.status === 'pending').length}</li>
        </ul>
      </article>

      <article className="profile-panel">
        <h3>Recent Tasks</h3>
        {app.recentTasks.length === 0 ? (
          <p>No tasks yet. Add your first task from the Tasks tab.</p>
        ) : (
          <ul className="profile-recent-list">
            {app.recentTasks.map((task) => (
              <li key={task.id}>
                <span>{task.title}</span>
                <small>
                  {formatStatus(task.status)} | {task.priority} | {formatDueDate(task.dueDate)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  </section>
)

export default ProfileSection