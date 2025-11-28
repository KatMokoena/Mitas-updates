import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { ProjectStatus, ComponentType, TaskStatus } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import './ProjectDetail.css';

interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  components: ComponentType[];
  startDate?: string;
  endDate?: string;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  estimatedDays: number;
  actualDays?: number;
  assignedUserId?: string;
  resourceIds?: string[];
  dependencies: string[];
  milestone: boolean;
}

interface Resource {
  id: string;
  name: string;
  type: 'labour' | 'equipment';
  allocatedTaskIds: string[];
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { user } = useAuth();

  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    status: TaskStatus.NOT_STARTED,
    startDate: '',
    endDate: '',
    estimatedDays: 1,
    assignedUserId: '',
    resourceIds: [] as string[],
    dependencies: [] as string[],
    milestone: false,
  });

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchTasks();
      fetchResources();
      fetchUsers();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/tasks`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/resources`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const canEditTasks = user?.role === 'ADMIN' || user?.role === 'admin' || user?.role === 'PROJECT_MANAGER' || user?.role === 'project_manager';

  // Check for resource conflicts
  const getResourceConflicts = (taskId: string, resourceIds: string[]): string[] => {
    const conflicts: string[] = [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return conflicts;

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    for (const resourceId of resourceIds) {
      const conflictingTasks = tasks.filter((t) => {
        if (t.id === taskId) return false;
        if (!t.resourceIds || !t.resourceIds.includes(resourceId)) return false;

        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.endDate);

        // Check for date overlap
        return (
          (taskStart <= tStart && taskEnd >= tStart) ||
          (taskStart <= tEnd && taskEnd >= tEnd) ||
          (taskStart >= tStart && taskEnd <= tEnd)
        );
      });

      if (conflictingTasks.length > 0) {
        const resource = resources.find((r) => r.id === resourceId);
        if (resource) {
          conflicts.push(
            `${resource.name} (conflicts with: ${conflictingTasks.map((t) => t.title).join(', ')})`
          );
        }
      }
    }

    return conflicts;
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setTaskFormData({
      title: '',
      description: '',
      status: TaskStatus.NOT_STARTED,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      estimatedDays: 1,
      assignedUserId: '',
      resourceIds: [],
      dependencies: [],
      milestone: false,
    });
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    // Note: We no longer lock editing based on dependencies
    // Dependencies only prevent completion, not editing
    // Prerequisite tasks remain editable even when they have dependent tasks

    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      startDate: task.startDate.split('T')[0],
      endDate: task.endDate.split('T')[0],
      estimatedDays: task.estimatedDays,
      assignedUserId: task.assignedUserId || '',
      resourceIds: task.resourceIds || [],
      dependencies: task.dependencies,
      milestone: task.milestone,
    });
    setShowTaskModal(true);
    
    // Clear any previous validation (editing is always allowed)
    (window as any).__taskEditValidation = {
      incompleteDependencies: [],
      blockingTasks: [],
      isLocked: false, // Editing is never locked - only completion is restricted
    };
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check validation before saving (only for editing, not creating)
    if (editingTask) {
      const validation = (window as any).__taskEditValidation;
      if (validation && validation.isLocked) {
        let message = 'Cannot edit this task:\n\n';
        if (validation.incompleteDependencies.length > 0) {
          message += `• This task depends on incomplete tasks: ${validation.incompleteDependencies.join(', ')}\n`;
          message += '  Please complete the dependent tasks first.\n\n';
        }
        if (validation.blockingTasks.length > 0) {
          message += `• This task is a dependency of incomplete tasks: ${validation.blockingTasks.join(', ')}\n`;
          message += '  Please complete those tasks first before editing this one.\n';
        }
        alert(message);
        return;
      }

      // Validate dependencies are completed before allowing completion (not editing)
      // Only block if trying to mark as completed
      if (taskFormData.status === TaskStatus.COMPLETED) {
        if (taskFormData.dependencies && taskFormData.dependencies.length > 0) {
          const incompleteDeps = taskFormData.dependencies.filter((depId) => {
            const depTask = tasks.find((t) => t.id === depId);
            return depTask && depTask.status !== TaskStatus.COMPLETED;
          });
          
          if (incompleteDeps.length > 0) {
            const depTaskNames = incompleteDeps.map((depId) => {
              const depTask = tasks.find((t) => t.id === depId);
              return depTask?.title || depId;
            });
            alert(`Cannot complete this task. The following dependent tasks must be completed first:\n\n${depTaskNames.join(', ')}\n\nPlease complete the dependent tasks before marking this task as completed.`);
            return;
          }
        }
      }
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      const url = editingTask
        ? `${API_BASE_URL}/api/tasks/${editingTask.id}`
        : `${API_BASE_URL}/api/tasks`;

      const taskData = {
        ...taskFormData,
        projectId: id,
        startDate: new Date(taskFormData.startDate).toISOString(),
        endDate: new Date(taskFormData.endDate).toISOString(),
      };

      const response = await fetch(url, {
        method: editingTask ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        setShowTaskModal(false);
        setEditingTask(null);
        // Clear validation
        delete (window as any).__taskEditValidation;
        fetchTasks();
        // Update resource allocations
        updateResourceAllocations();
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const updateResourceAllocations = async () => {
    // Update resources to reflect task allocations
    for (const resource of resources) {
      const allocatedTasks = tasks.filter(
        (t) => t.resourceIds && t.resourceIds.includes(resource.id)
      );
      const newAllocatedTaskIds = allocatedTasks.map((t) => t.id);

      if (JSON.stringify(newAllocatedTaskIds) !== JSON.stringify(resource.allocatedTaskIds)) {
        try {
          const sessionId = localStorage.getItem('sessionId');
          await fetch(`${API_BASE_URL}/api/resources/${resource.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': sessionId || '',
            },
            body: JSON.stringify({
              ...resource,
              allocatedTaskIds: newAllocatedTaskIds,
            }),
          });
        } catch (error) {
          console.error('Failed to update resource allocation:', error);
        }
      }
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.IN_PROGRESS:
        return '#3498db';
      case TaskStatus.COMPLETED:
        return '#27ae60';
      case TaskStatus.BLOCKED:
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getDependencyNames = (dependencyIds: string[]): string => {
    return dependencyIds
      .map((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        return depTask ? depTask.title : depId;
      })
      .join(', ');
  };

  const getResourceNames = (resourceIds: string[] = []): string => {
    return resourceIds
      .map((resId) => {
        const resource = resources.find((r) => r.id === resId);
        return resource ? resource.name : resId;
      })
      .join(', ');
  };

  if (loading) {
    return <div className="project-detail-loading">Loading...</div>;
  }

  if (!project) {
    return <div className="project-detail-error">Project not found</div>;
  }

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <Link to="/projects" className="back-link">← Back to Projects</Link>
        <h1>{project.title}</h1>
        <p className="project-description">{project.description}</p>
        <div className="project-meta">
          <span className="status-badge" style={{ backgroundColor: '#3498db' }}>
            {project.status.replace('_', ' ')}
          </span>
          {project.components.length > 0 && (
            <span className="components-info">
              {project.components.length} component{project.components.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="project-detail-content">
        <div className="tasks-section">
          <div className="section-header">
            <h2>Tasks</h2>
            {canEditTasks && (
              <button onClick={handleCreateTask} className="btn-primary">
                + New Task
              </button>
            )}
          </div>

          <div className="tasks-list">
            {tasks.map((task) => {
              const conflicts = getResourceConflicts(task.id, task.resourceIds || []);
              return (
                <div key={task.id} className="task-item">
                  <div className="task-info">
                    <div className="task-header">
                      <h3>{task.title}</h3>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(task.status) }}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p>{task.description}</p>
                    <div className="task-meta">
                      <span>
                        📅 {new Date(task.startDate).toLocaleDateString()} -{' '}
                        {new Date(task.endDate).toLocaleDateString()}
                      </span>
                      {task.milestone && <span className="milestone-badge">Milestone</span>}
                    </div>
                    {task.dependencies.length > 0 && (
                      <div className="task-dependencies">
                        <strong>Depends on:</strong> {getDependencyNames(task.dependencies)}
                      </div>
                    )}
                    {task.resourceIds && task.resourceIds.length > 0 && (
                      <div className="task-resources">
                        <strong>Resources:</strong>
                        <div className="resource-tags">
                          {task.resourceIds.map((resId) => {
                            const resource = resources.find((r) => r.id === resId);
                            if (!resource) return null;
                            const isConflict = conflicts.some((c) => c.includes(resource.name));
                            return (
                              <span
                                key={resId}
                                className={`resource-tag ${resource.type} ${isConflict ? 'conflict' : ''}`}
                                title={isConflict ? 'Resource conflict detected' : ''}
                              >
                                {resource.name} ({resource.type})
                                {isConflict && ' ⚠️'}
                              </span>
                            );
                          })}
                        </div>
                        {conflicts.length > 0 && (
                          <div className="conflict-warning">
                            ⚠️ Resource conflicts detected: {conflicts.join('; ')}
                          </div>
                        )}
                      </div>
                    )}
                    {task.assignedUserId && (
                      <div className="task-assignee">
                        <strong>Assigned to:</strong>{' '}
                        {users.find((u) => u.id === task.assignedUserId)?.username || 'Unknown'}
                      </div>
                    )}
                  </div>
                  {canEditTasks && (
                    <div className="task-actions">
                      <button onClick={() => handleEditTask(task)} className="btn-edit">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)} className="btn-delete">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="empty-state">
                <p>No tasks yet. Create your first task to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => {
          delete (window as any).__taskEditValidation;
          setShowTaskModal(false);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? 'Edit Task' : 'Create Task'}</h2>
            
            <form onSubmit={handleTaskSubmit}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    required
                    disabled={isLocked}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    rows={3}
                    required
                    disabled={isLocked}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={taskFormData.startDate}
                      onChange={(e) => setTaskFormData({ ...taskFormData, startDate: e.target.value })}
                      required
                      disabled={isLocked}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={taskFormData.endDate}
                      onChange={(e) => setTaskFormData({ ...taskFormData, endDate: e.target.value })}
                      required
                      disabled={isLocked}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Estimated Days</label>
                    <input
                      type="number"
                      value={taskFormData.estimatedDays}
                      onChange={(e) =>
                        setTaskFormData({ ...taskFormData, estimatedDays: parseInt(e.target.value) })
                      }
                      min="1"
                      required
                      disabled={isLocked}
                    />
                  </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={taskFormData.status}
                    onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value as TaskStatus })}
                  >
                    {Object.values(TaskStatus).map((status: TaskStatus) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  {taskFormData.status === TaskStatus.COMPLETED && taskFormData.dependencies && taskFormData.dependencies.length > 0 && (
                    <small style={{ color: '#fbbf24', display: 'block', marginTop: '4px' }}>
                      ⚠️ Note: This task cannot be marked as completed until all dependent tasks are completed.
                    </small>
                  )}
                </div>
                </div>
                <div className="form-group">
                  <label>Assigned User</label>
                  <select
                    value={taskFormData.assignedUserId}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assignedUserId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Resources (Labour & Equipment)</label>
                  <div className="resource-checkboxes">
                    {resources.map((resource) => (
                      <label key={resource.id} className="resource-checkbox">
                        <input
                          type="checkbox"
                          checked={taskFormData.resourceIds.includes(resource.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTaskFormData({
                                ...taskFormData,
                                resourceIds: [...taskFormData.resourceIds, resource.id],
                              });
                            } else {
                              setTaskFormData({
                                ...taskFormData,
                                resourceIds: taskFormData.resourceIds.filter((id) => id !== resource.id),
                              });
                            }
                          }}
                        />
                        <span>
                          {resource.name} ({resource.type})
                        </span>
                      </label>
                    ))}
                    {resources.length === 0 && (
                      <p className="hint-text">No resources available. Create resources first.</p>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Dependencies (Tasks this depends on)</label>
                  <div className="dependency-checkboxes">
                    {tasks
                      .filter((t) => !editingTask || t.id !== editingTask.id)
                      .map((task) => (
                        <label key={task.id} className="dependency-checkbox">
                          <input
                            type="checkbox"
                            checked={taskFormData.dependencies.includes(task.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTaskFormData({
                                  ...taskFormData,
                                  dependencies: [...taskFormData.dependencies, task.id],
                                });
                              } else {
                                setTaskFormData({
                                  ...taskFormData,
                                  dependencies: taskFormData.dependencies.filter((id) => id !== task.id),
                                });
                              }
                            }}
                          />
                          <span>{task.title}</span>
                        </label>
                      ))}
                    {tasks.filter((t) => !editingTask || t.id !== editingTask.id).length === 0 && (
                      <p className="hint-text">No other tasks available for dependencies.</p>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={taskFormData.milestone}
                      onChange={(e) => setTaskFormData({ ...taskFormData, milestone: e.target.checked })}
                    />
                    Mark as Milestone
                  </label>
                </div>
                <div className="modal-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      delete (window as any).__taskEditValidation;
                      setShowTaskModal(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    {editingTask ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default ProjectDetail;
