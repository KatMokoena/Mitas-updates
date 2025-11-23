import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { TaskStatus } from '../../shared/types';
import './GanttView.css';

interface Task {
  id: string;
  projectId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: TaskStatus;
  dependencies: string[];
  milestone: boolean;
  assignedUserId?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
  custom_class?: string;
  assignedUserId?: string;
}

const GanttView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<number>(0);

  // Real-time updates: poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Only poll if it's been at least 5 seconds since last update
      if (now - lastUpdateRef.current > 5000) {
        fetchAllTasks();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchAllTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && ganttContainerRef.current) {
      initializeGantt();
    }
  }, [tasks, selectedProject, users]);

  const fetchProjects = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
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

  const fetchAllTasks = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        lastUpdateRef.current = Date.now();
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          ...task,
          ...updates,
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        
        // Propagate dependencies: if end date changed, update dependent tasks
        if (updates.endDate && task.dependencies.length > 0) {
          await propagateDependencies(taskId, new Date(updates.endDate));
        }

        // Update local state immediately for instant feedback
        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === taskId ? updatedTask : t))
        );
        
        // Refresh all tasks to get latest state
        setTimeout(() => fetchAllTasks(), 500);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const propagateDependencies = async (taskId: string, newEndDate: Date) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Find all tasks that depend on this task
    const dependentTasks = tasks.filter((t) =>
      t.dependencies.includes(taskId)
    );

    for (const dependentTask of dependentTasks) {
      const currentStartDate = new Date(dependentTask.startDate);
      const newStartDate = new Date(newEndDate);
      newStartDate.setDate(newStartDate.getDate() + 1); // Start next day

      // Only update if the new start date is later than current
      if (newStartDate > currentStartDate) {
        const duration =
          new Date(dependentTask.endDate).getTime() -
          currentStartDate.getTime();
        const newEndDateForDependent = new Date(newStartDate);
        newEndDateForDependent.setTime(
          newEndDateForDependent.getTime() + duration
        );

        await updateTask(dependentTask.id, {
          startDate: newStartDate.toISOString(),
          endDate: newEndDateForDependent.toISOString(),
        });
      }
    }
  };

  const initializeGantt = () => {
    // Clear previous Gantt
    if (ganttContainerRef.current) {
      ganttContainerRef.current.innerHTML = '';
    }

    // Filter tasks by project
    let filteredTasks = tasks;
    if (selectedProject !== 'all') {
      filteredTasks = tasks.filter((t) => t.projectId === selectedProject);
    }

    if (filteredTasks.length === 0) {
      if (ganttContainerRef.current) {
        ganttContainerRef.current.innerHTML =
          '<div class="gantt-empty">No tasks to display</div>';
      }
      return;
    }

    // Convert tasks to Gantt format
    const ganttTasks: GanttTask[] = filteredTasks.map((task) => {
      const start = new Date(task.startDate);
      const end = new Date(task.endDate);
      const progress =
        task.status === TaskStatus.COMPLETED
          ? 100
          : task.status === TaskStatus.IN_PROGRESS
          ? 50
          : 0;

      return {
        id: task.id,
        name: task.title,
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        progress,
        dependencies: task.dependencies.join(','),
        custom_class: task.milestone
          ? 'milestone'
          : task.status === TaskStatus.COMPLETED
          ? 'completed'
          : '',
        assignedUserId: task.assignedUserId,
      };
    });

    // Simple Gantt visualization using HTML/CSS
    renderSimpleGantt(ganttTasks);
  };

  const renderSimpleGantt = (ganttTasks: GanttTask[]) => {
    if (!ganttContainerRef.current) return;

    // Find date range
    const dates = ganttTasks.flatMap((t) => [
      new Date(t.start),
      new Date(t.end),
    ]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const daysDiff = Math.ceil(
      (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create Gantt chart
    const ganttHTML = `
      <div class="gantt-chart">
        <div class="gantt-header">
          <div class="gantt-task-column">Task</div>
          <div class="gantt-timeline" style="width: ${Math.max(800, daysDiff * 20)}px">
            ${Array.from({ length: Math.min(30, daysDiff) }, (_, i) => {
              const date = new Date(minDate);
              date.setDate(
                date.getDate() +
                  Math.floor((i * daysDiff) / Math.min(30, daysDiff))
              );
              return `<div class="gantt-date-header">${date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}</div>`;
            }).join('')}
          </div>
        </div>
        ${ganttTasks.map((task) => {
          const start = new Date(task.start);
          const end = new Date(task.end);
          const left =
            ((start.getTime() - minDate.getTime()) /
              (1000 * 60 * 60 * 24) /
              daysDiff) *
            100;
          const width =
            ((end.getTime() - start.getTime()) /
              (1000 * 60 * 60 * 24) /
              daysDiff) *
            100;

          const assignedUser = task.assignedUserId
            ? users.find((u) => u.id === task.assignedUserId)
            : null;

          return `
            <div class="gantt-row" data-task-id="${task.id}">
              <div class="gantt-task-name">
                <div class="task-name-text">${task.name}</div>
                <select 
                  class="task-assignee-select" 
                  data-task-id="${task.id}"
                  value="${task.assignedUserId || ''}"
                >
                  <option value="">Unassigned</option>
                  ${users.map(
                    (u) =>
                      `<option value="${u.id}" ${
                        u.id === task.assignedUserId ? 'selected' : ''
                      }>${u.username}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="gantt-bar-container">
                <div 
                  class="gantt-bar ${task.custom_class} ${draggedTaskId === task.id ? 'dragging' : ''}" 
                  style="left: ${left}%; width: ${Math.max(2, width)}%;"
                  data-task-id="${task.id}"
                  draggable="true"
                >
                  <div class="gantt-resize-handle gantt-resize-left" data-task-id="${task.id}" data-edge="start"></div>
                  <div class="gantt-progress" style="width: ${task.progress}%"></div>
                  <div class="gantt-bar-label">${task.name}</div>
                  <div class="gantt-resize-handle gantt-resize-right" data-task-id="${task.id}" data-edge="end"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    ganttContainerRef.current.innerHTML = ganttHTML;

    // Add event listeners
    setupEventListeners();
  };

  const setupEventListeners = () => {
    if (!ganttContainerRef.current) return;

    // Drag handlers for task shifting
    const bars = ganttContainerRef.current.querySelectorAll('.gantt-bar');
    bars.forEach((bar) => {
      bar.addEventListener('dragstart', handleDragStart);
      bar.addEventListener('dragend', handleDragEnd);
    });

    const containers = ganttContainerRef.current.querySelectorAll(
      '.gantt-bar-container'
    );
    containers.forEach((container) => {
      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('drop', handleDrop);
    });

    // Resize handlers for deadline adjustment
    const resizeHandles = ganttContainerRef.current.querySelectorAll(
      '.gantt-resize-handle'
    );
    resizeHandles.forEach((handle) => {
      handle.addEventListener('mousedown', handleResizeStart);
    });

    // Resource reassignment
    const assigneeSelects = ganttContainerRef.current.querySelectorAll(
      '.task-assignee-select'
    );
    assigneeSelects.forEach((select) => {
      select.addEventListener('change', handleAssigneeChange);
    });
  };

  const handleDragStart = (e: Event) => {
    const dragEvent = e as DragEvent;
    const target = dragEvent.target as HTMLElement;
    const taskId = target.getAttribute('data-task-id');
    if (taskId) {
      setDraggedTaskId(taskId);
      target.classList.add('dragging');
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.effectAllowed = 'move';
        dragEvent.dataTransfer.setData('text/plain', taskId);
      }
    }
  };

  const handleDragEnd = (e: Event) => {
    const dragEvent = e as DragEvent;
    const target = dragEvent.target as HTMLElement;
    target.classList.remove('dragging');
    setDraggedTaskId(null);
  };

  const handleDragOver = (e: Event) => {
    const dragEvent = e as DragEvent;
    dragEvent.preventDefault();
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = async (e: Event) => {
    const dragEvent = e as DragEvent;
    dragEvent.preventDefault();
    const taskId = dragEvent.dataTransfer?.getData('text/plain');
    if (!taskId) return;

    const container = (dragEvent.target as HTMLElement).closest(
      '.gantt-bar-container'
    );
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = dragEvent.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    // Calculate new dates based on drop position
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const filteredTasks =
      selectedProject === 'all'
        ? tasks
        : tasks.filter((t) => t.projectId === selectedProject);
    const dates = filteredTasks.flatMap((t) => [
      new Date(t.startDate),
      new Date(t.endDate),
    ]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const daysDiff = Math.ceil(
      (new Date(Math.max(...dates.map((d) => d.getTime()))).getTime() -
        minDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const daysOffset = Math.floor((percentage / 100) * daysDiff);
    const newStartDate = new Date(minDate);
    newStartDate.setDate(newStartDate.getDate() + daysOffset);

    const taskDuration = Math.ceil(
      (new Date(task.endDate).getTime() -
        new Date(task.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + taskDuration);

    // Update task via API
    await updateTask(taskId, {
      startDate: newStartDate.toISOString(),
      endDate: newEndDate.toISOString(),
    });
  };

  const handleResizeStart = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    const target = mouseEvent.target as HTMLElement;
    const taskId = target.getAttribute('data-task-id');
    const edge = target.getAttribute('data-edge') as 'start' | 'end';

    if (taskId && edge) {
      setResizingTaskId(taskId);
      setResizeEdge(edge);

      let lastUpdateTime = 0;
      const throttleDelay = 100; // Throttle updates to every 100ms

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const now = Date.now();
        if (now - lastUpdateTime < throttleDelay) return;
        lastUpdateTime = now;

        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const container = target.closest('.gantt-bar-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

        const filteredTasks =
          selectedProject === 'all'
            ? tasks
            : tasks.filter((t) => t.projectId === selectedProject);
        const dates = filteredTasks.flatMap((t) => [
          new Date(t.startDate),
          new Date(t.endDate),
        ]);
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const daysDiff = Math.ceil(
          (new Date(Math.max(...dates.map((d) => d.getTime()))).getTime() -
            minDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const daysOffset = Math.floor((percentage / 100) * daysDiff);
        const newDate = new Date(minDate);
        newDate.setDate(newDate.getDate() + daysOffset);

        if (edge === 'start') {
          const currentEnd = new Date(task.endDate);
          if (newDate < currentEnd) {
            // Update optimistically
            setTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.id === taskId
                  ? { ...t, startDate: newDate.toISOString() }
                  : t
              )
            );
          }
        } else {
          const currentStart = new Date(task.startDate);
          if (newDate > currentStart) {
            // Update optimistically
            setTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.id === taskId ? { ...t, endDate: newDate.toISOString() } : t
              )
            );
          }
        }
      };

      const handleMouseUp = async () => {
        // Get the latest task state
        setTasks((currentTasks) => {
          const currentTask = currentTasks.find((t) => t.id === taskId);
          if (currentTask && resizeEdge) {
            // Final update to server
            if (resizeEdge === 'start') {
              updateTask(taskId, {
                startDate: currentTask.startDate,
              });
            } else {
              updateTask(taskId, {
                endDate: currentTask.endDate,
              });
            }
          }
          return currentTasks;
        });

        setResizingTaskId(null);
        setResizeEdge(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleAssigneeChange = async (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const taskId = target.getAttribute('data-task-id');
    const userId = target.value || undefined;

    if (taskId) {
      await updateTask(taskId, {
        assignedUserId: userId,
      });
    }
  };

  if (loading) {
    return <div className="gantt-loading">Loading...</div>;
  }

  return (
    <div className="gantt-view">
      <div className="gantt-header-controls">
        <h1>Gantt Chart</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="project-selector"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <div className="gantt-info">
            <span>🔄 Auto-updating every 5s</span>
          </div>
        </div>
      </div>
      <div className="gantt-container" ref={ganttContainerRef}></div>
    </div>
  );
};

export default GanttView;
