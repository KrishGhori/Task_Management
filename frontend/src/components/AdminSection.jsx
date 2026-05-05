const AdminSection = ({ app }) => (
  <section className="admin-view" aria-label="Admin workspace">
    <header className="admin-header">
      <div>
        <p className="kicker">Admin section</p>
        <h2>Assign work to employees</h2>
        <p className="subtitle">Only admins can assign tasks. Only employees can complete assigned work.</p>
      </div>

      <div className="profile-stats admin-stats">
        <article>
          <h3>Users</h3>
          <p>{app.users.length}</p>
        </article>
        <article>
          <h3>Admins</h3>
          <p>{app.adminCount}</p>
        </article>
        <article>
          <h3>Employees</h3>
          <p>{app.employeeCount}</p>
        </article>
      </div>
    </header>

    <div className="profile-grid admin-grid">
      <article className="profile-panel">
        <h3>Team roles</h3>
        <p>This workspace supports only admin and employee roles.</p>

        <ul className="team-list">
          {app.users.map((item) => (
            <li key={item.id} className="team-row">
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.email} · <span className={`role-badge ${item.role}`}>{app.formatRole(item.role)}</span>
                </small>
              </div>

              {item.role === 'admin' ? (
                <span className="role-lock">Admin account</span>
              ) : (
                <div className="team-actions">
                  <button
                    type="button"
                    className={`ghost ${item.role === 'employee' ? 'active-nav' : ''}`}
                    onClick={() => app.updateUserRole(item.id, 'employee')}
                    disabled={app.roleSavingId === item.id || item.role === 'employee'}
                  >
                    Set as Employee
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </article>

      <article className="profile-panel">
        <h3>Assign task</h3>
        <p>Use this form to assign work only to employees.</p>

        <form className="task-form admin-task-form" onSubmit={app.onAdminCreateTask}>
          <label htmlFor="admin-task-input" className="sr-only">
            Task title
          </label>
          <input
            id="admin-task-input"
            type="text"
            value={app.adminDraft}
            onChange={(event) => app.setAdminDraft(event.target.value)}
            placeholder="Add an assigned task"
            maxLength={120}
          />
          <input
            type="date"
            value={app.adminDraftDueDate}
            onChange={(event) => app.setAdminDraftDueDate(event.target.value)}
            aria-label="Admin due date"
          />
          <select
            value={app.adminDraftPriority}
            onChange={(event) => app.setAdminDraftPriority(event.target.value)}
            aria-label="Admin priority"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select
            value={app.adminDraftAssigneeId}
            onChange={(event) => app.setAdminDraftAssigneeId(event.target.value)}
            aria-label="Assign to user"
            required
          >
            <option value="" disabled hidden>
              Select employee
            </option>
            {app.assignableUsers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({app.formatRole(item.role)})
              </option>
            ))}
          </select>
          <button type="submit" disabled={app.adminTaskSaving || app.assignableUsers.length === 0}>
            {app.adminTaskSaving ? 'Assigning...' : 'Assign Task'}
          </button>
        </form>

        <p className="admin-note">Assignable users: {app.assignableCount}</p>
      </article>
    </div>
  </section>
)

export default AdminSection