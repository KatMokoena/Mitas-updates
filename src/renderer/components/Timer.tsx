import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import './Timer.css';

interface TimerProps {
  projectId: string;
  taskId?: string;
  orderId?: string;
  onTimerUpdate?: () => void;
}

interface Task {
  id: string;
  title: string;
  projectId: string;
  orderId?: string;
}

interface RunningTimer {
  id: string;
  projectId: string;
  taskId?: string;
  startTime: string;
  description?: string;
}

const Timer: React.FC<TimerProps> = ({ projectId, taskId: initialTaskId, orderId, onTimerUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId || '');

  // Check for running timer on mount and when projectId changes
  useEffect(() => {
    checkRunningTimer();
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/tasks?projectId=${projectId}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  // Update elapsed time every second if timer is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (runningTimer) {
      interval = setInterval(() => {
        const start = new Date(runningTimer.startTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [runningTimer]);

  const checkRunningTimer = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/time-tracking/timer/running`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const timer = await response.json();
        if (timer && timer.projectId === projectId) {
          setRunningTimer(timer);
          const start = new Date(timer.startTime).getTime();
          const now = Date.now();
          setElapsedTime(Math.floor((now - start) / 1000));
        } else {
          setRunningTimer(null);
          setElapsedTime(0);
        }
      } else {
        setRunningTimer(null);
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Failed to check running timer:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/time-tracking/timer/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          projectId,
          taskId: selectedTaskId || undefined,
          orderId,
          description: description.trim() || undefined,
        }),
      });

      if (response.ok) {
        const timer = await response.json();
        setRunningTimer(timer);
        setElapsedTime(0);
        setDescription('');
        if (onTimerUpdate) onTimerUpdate();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to start timer');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!user || !runningTimer) return;

    setLoading(true);
    setError('');

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/time-tracking/timer/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          timeEntryId: runningTimer.id,
        }),
      });

      if (response.ok) {
        setRunningTimer(null);
        setElapsedTime(0);
        if (onTimerUpdate) onTimerUpdate();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to stop timer');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const isRunning = runningTimer !== null;

  return (
    <div className="timer-container">
      <div className="timer-display">
        <div className="timer-time">{formatTime(elapsedTime)}</div>
        {isRunning && (
          <div className="timer-status">
            <span className="timer-indicator"></span>
            Running
          </div>
        )}
      </div>

      {error && <div className="timer-error">{error}</div>}

      {!isRunning ? (
        <div className="timer-controls">
          <div className="timer-task-selector">
            <label>Task (Optional)</label>
            <div className="task-select-wrapper">
              <select
                className="timer-task-select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="">No Task Selected</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="timer-add-task-btn"
                onClick={() => {
                  if (orderId) {
                    navigate(`/orders/${orderId}`);
                  } else {
                    // Try to find orderId from tasks
                    const taskWithOrder = tasks.find(t => t.orderId);
                    if (taskWithOrder?.orderId) {
                      navigate(`/orders/${taskWithOrder.orderId}`);
                    } else {
                      alert('Please navigate to the project overview to add tasks.');
                    }
                  }
                }}
                title="Add new task"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="text"
            className="timer-description-input"
            placeholder="What are you working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleStart();
              }
            }}
          />
          <button
            className="timer-button timer-button-start"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Timer'}
          </button>
        </div>
      ) : (
        <div className="timer-controls">
          <button
            className="timer-button timer-button-stop"
            onClick={handleStop}
            disabled={loading}
          >
            {loading ? 'Stopping...' : 'Stop Timer'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Timer;

