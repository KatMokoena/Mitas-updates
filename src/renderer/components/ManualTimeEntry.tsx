import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import './ManualTimeEntry.css';

interface ManualTimeEntryProps {
  projectId: string;
  taskId?: string;
  orderId?: string;
  onEntryCreated?: () => void;
}

interface Task {
  id: string;
  title: string;
  projectId: string;
  orderId?: string;
}

const ManualTimeEntry: React.FC<ManualTimeEntryProps> = ({ projectId, taskId: initialTaskId, orderId, onEntryCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId || '');

  useEffect(() => {
    // Set default to today
    const now = new Date();
    setStartDate(now.toISOString().split('T')[0]);
    setStartTime(now.toTimeString().slice(0, 5));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Combine date and time
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const hours = parseFloat(durationHours);

      if (isNaN(hours) || hours <= 0) {
        setError('Duration must be a positive number');
        setLoading(false);
        return;
      }

      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/time-tracking/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          projectId,
          taskId: selectedTaskId || undefined,
          orderId,
          startTime: startDateTime.toISOString(),
          durationHours: hours,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        // Reset form
        setStartDate(new Date().toISOString().split('T')[0]);
        setStartTime(new Date().toTimeString().slice(0, 5));
        setDurationHours('');
        setDescription('');
        setNotes('');
        
        if (onEntryCreated) {
          onEntryCreated();
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create time entry');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manual-time-entry">
      <h3>Add Manual Time Entry</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Task (Optional)</label>
          <div className="task-select-wrapper">
            <select
              className="task-select"
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
              className="add-task-btn"
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

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Duration (Hours)</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              placeholder="e.g., 2.5"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
          />
        </div>

        <div className="form-group">
          <label>Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
            rows={3}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Time entry created successfully!</div>}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Creating...' : 'Add Time Entry'}
        </button>
      </form>
    </div>
  );
};

export default ManualTimeEntry;

