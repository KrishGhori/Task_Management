import { formatDueDate, formatRole, formatStatus, nextStatus } from '../utils/taskHelpers'
import AdminSection from './AdminSection'
import ProfileSection from './ProfileSection'

const DashboardScreen = ({ app }) => (
  <section className="card">
    <div className="top-row">
      <p className="welcome">Signed in as {app.user.name}</p>
      <div className="top-actions">
        <button
          type="button"
          className={`ghost ${app.activeView === 'tasks' ? 'active-nav' : ''}`}
          onClick={() => app.setActiveView('tasks')}
        >
          Tasks
        </button>
        <button
          type="button"
          className={`ghost ${app.activeView === 'profile' ? 'active-nav' : ''}`}
          onClick={() => app.setActiveView('profile')}
        >
          Profile
        </button>
        {app.isAdmin ? (
          <button
            type="button"
            className={`ghost ${app.activeView === 'admin' ? 'active-nav' : ''}`}
            onClick={() => app.setActiveView('admin')}
          >
            Admin
          </button>
        ) : null}
        <button type="button" className="ghost" onClick={app.onLogout}>
          Logout
        </button>
      </div>
    </div>

    {app.message ? <p className="message">{app.message}</p> : null}

    {app.activeView === 'admin' && app.isAdmin ? (
      <AdminSection app={app} />
    ) : app.activeView === 'profile' ? (
      <ProfileSection app={app} />
    ) : (
      <>
        {app.notifications.length > 0 ? (
          <section className="notification-panel" aria-label="Notifications">
            {app.notifications.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </section>
        ) : null}

        {app.isAdmin ? (
          <form className="task-form task-form-admin" onSubmit={app.onCreateTask}>
            <label htmlFor="task-input" className="sr-only">
              New task
            </label>
            <input
              id="task-input"
              type="text"
              value={app.draft}
              onChange={(event) => app.setDraft(event.target.value)}
              placeholder="Add a task"
              maxLength={120}
            />
            <input
              type="date"
              value={app.draftDueDate}
              onChange={(event) => app.setDraftDueDate(event.target.value)}
              aria-label="Due date"
            />
            <select
              value={app.draftPriority}
              onChange={(event) => app.setDraftPriority(event.target.value)}
              aria-label="Priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={app.draftStatus}
              onChange={(event) => app.setDraftStatus(event.target.value)}
              aria-label="Status"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={app.draftAssigneeId}
              onChange={(event) => app.setDraftAssigneeId(event.target.value)}
              aria-label="Assign to employee"
            >
              <option value="">Assign to employee (optional)</option>
              {app.assignableUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatRole(item.role)})
                </option>
              ))}
            </select>

            <button type="submit" disabled={app.isSaving}>
              {app.isSaving ? 'Adding...' : 'Add / Assign Task'}
            </button>
          </form>
        ) : null}

        <div className="toolbar filters-wrap">
          <input
            type="search"
            className="search-input"
            placeholder="Search tasks"
            value={app.searchQuery}
            onChange={(event) => app.setSearchQuery(event.target.value)}
            aria-label="Search tasks"
          />

          <div className="filters" role="tablist" aria-label="Task status filter">
            {['all', 'pending', 'in_progress', 'completed'].map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={app.filter === item}
                className={app.filter === item ? 'active' : ''}
                onClick={() => app.setFilter(item)}
              >
                {item === 'in_progress' ? 'in progress' : item}
              </button>
            ))}
          </div>

          <select
            value={app.priorityFilter}
            onChange={(event) => app.setPriorityFilter(event.target.value)}
            aria-label="Priority filter"
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={app.ownerFilter}
            onChange={(event) => app.setOwnershipFilter(event.target.value)}
            aria-label="Ownership filter"
          >
            <option value="all">All tasks</option>
            <option value="owned">Owned by me</option>
            <option value="assigned">Assigned to me</option>
          </select>

          <button type="button" className="ghost" onClick={app.clearCompleted} disabled={app.completedCount === 0}>
            Clear Completed
          </button>
        </div>

        <ul className="task-list">
          {app.loading ? (
            <li className="empty">Loading tasks...</li>
          ) : app.filteredTasks.length === 0 ? (
            <li className="empty">No tasks found for your current filters.</li>
          ) : (
            app.filteredTasks.map((task) => (
              <li key={task.id} className={task.status === 'completed' ? 'done' : ''}>
                <button
                  type="button"
                  className={`status-chip ${task.status}`}
                  onClick={() => {
                    if (task.status === 'in_progress' && !app.canCompleteTask(task)) {
                      app.setMessage('Only the assigned employee can complete this task.')
                      return
                    }

                    if (task.status !== 'completed') {
                      app.updateTaskStatus(task.id, nextStatus(task.status))
                    }
                  }}
                  disabled={task.status === 'completed' || (task.status === 'in_progress' && !app.canCompleteTask(task))}
                  aria-label={`Set next status for ${task.title}`}
                >
                  {formatStatus(task.status)}
                </button>

                {app.editingId === task.id && task.status !== 'completed' ? (
                  <div className="edit-panel">
                    <input
                      type="text"
                      value={app.editingTitle}
                      onChange={(event) => app.setEditingTitle(event.target.value)}
                      maxLength={120}
                    />
                    <input
                      type="date"
                      value={app.editingDueDate}
                      onChange={(event) => app.setEditingDueDate(event.target.value)}
                    />
                    <select
                      value={app.editingPriority}
                      onChange={(event) => app.setEditingPriority(event.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <select value={app.editingStatus} onChange={(event) => app.setEditingStatus(event.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    {app.isAdmin ? (
                      <select
                        value={app.editingAssigneeId}
                        onChange={(event) => app.setEditingAssigneeId(event.target.value)}
                      >
                        <option value="" disabled hidden>
                          Select assignee
                        </option>
                        {app.assignableUsers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({formatRole(item.role)})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <div className="actions">
                      <button type="button" className="save" onClick={() => app.saveEdit(task)}>
                        Save
                      </button>
                      <button type="button" className="ghost" onClick={app.cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="task-body">
                      <span>{task.title}</span>
                      <small>
                        {formatDueDate(task.dueDate)} | {task.priority} priority | assignee: {app.getUserName(task.assigneeId)}
                        {task.assigneeId ? ` (${formatRole(app.getUserRole(task.assigneeId))})` : ''}
                      </small>
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        className="edit"
                        onClick={() => app.startEdit(task)}
                        disabled={task.ownerId !== app.user.id || task.status === 'completed'}
                        title={
                          task.status === 'completed'
                            ? 'Completed tasks cannot be changed'
                            : task.ownerId !== app.user.id
                              ? 'Only task owner can edit details'
                              : 'Edit task'
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete"
                        onClick={() => app.deleteTask(task.id)}
                        disabled={task.ownerId !== app.user.id}
                        title={task.ownerId !== app.user.id ? 'Only task owner can delete' : 'Delete task'}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))
          )}
        </ul>

        <footer className="status">
          <p>
            {app.activeCount} active, {app.completedCount} completed
          </p>
          <p>{app.tasks.length} total tasks</p>
        </footer>

        <div className="mobile-actions" aria-label="Mobile quick actions">
          <button type="button" className="ghost" onClick={() => app.setShowHomePage(true)}>
            Home
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => document.getElementById('task-input')?.focus()}
          >
            Add Task
          </button>
          <button type="button" className="ghost" onClick={app.clearCompleted}>
            Clear
          </button>
        </div>
      </>
    )}
  </section>
)

export default DashboardScreen