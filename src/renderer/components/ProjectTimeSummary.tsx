import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './ProjectTimeSummary.css';

interface ProjectTimeSummaryProps {
  projectId: string;
}

interface TimeSummary {
  totalHours: number;
  totalEntries: number;
  byUser: Array<{
    userId: string;
    userName: string;
    totalHours: number;
    entryCount: number;
  }>;
  byTask: Array<{
    taskId: string;
    taskTitle: string;
    totalHours: number;
    entryCount: number;
  }>;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    totalHours: number;
    entryCount: number;
  }>;
  entries: Array<{
    id: string;
    userId: string;
    userName: string;
    taskId?: string;
    taskTitle?: string;
    entryType: string;
    startTime: string;
    endTime?: string;
    durationHours: number;
    description?: string;
    notes?: string;
  }>;
}

const ProjectTimeSummary: React.FC<ProjectTimeSummaryProps> = ({ projectId }) => {
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'byUser' | 'byTask' | 'byDepartment' | 'entries'>('overview');

  useEffect(() => {
    fetchSummary();
  }, [projectId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/time-tracking/projects/${projectId}/summary`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      } else {
        setError('Failed to load time summary');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/time-tracking/projects/${projectId}/export/pdf`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project-${projectId}-time-report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export PDF');
      }
    } catch (error) {
      alert('Failed to export PDF');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="time-summary-loading">Loading time summary...</div>;
  }

  if (error) {
    return <div className="time-summary-error">{error}</div>;
  }

  if (!summary) {
    return <div className="time-summary-empty">No time entries found for this project.</div>;
  }

  return (
    <div className="project-time-summary">
      <div className="summary-header">
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{summary.totalHours.toFixed(2)}</div>
            <div className="stat-label">Total Hours</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.totalEntries}</div>
            <div className="stat-label">Total Entries</div>
          </div>
        </div>
        <button className="export-button" onClick={handleExportPDF}>
          Export PDF
        </button>
      </div>

      <div className="summary-tabs">
        <button
          className={activeTab === 'overview' ? 'tab-active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'byUser' ? 'tab-active' : ''}
          onClick={() => setActiveTab('byUser')}
        >
          By User ({summary.byUser.length})
        </button>
        <button
          className={activeTab === 'byTask' ? 'tab-active' : ''}
          onClick={() => setActiveTab('byTask')}
        >
          By Task ({summary.byTask.length})
        </button>
        <button
          className={activeTab === 'byDepartment' ? 'tab-active' : ''}
          onClick={() => setActiveTab('byDepartment')}
        >
          By Department ({summary.byDepartment.length})
        </button>
        <button
          className={activeTab === 'entries' ? 'tab-active' : ''}
          onClick={() => setActiveTab('entries')}
        >
          All Entries ({summary.entries.length})
        </button>
      </div>

      <div className="summary-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="overview-section">
              <h4>Top Users</h4>
              {summary.byUser.slice(0, 5).map((user) => (
                <div key={user.userId} className="summary-item">
                  <span className="item-name">{user.userName}</span>
                  <span className="item-value">{user.totalHours.toFixed(2)}h ({user.entryCount} entries)</span>
                </div>
              ))}
            </div>
            <div className="overview-section">
              <h4>Top Tasks</h4>
              {summary.byTask.slice(0, 5).map((task) => (
                <div key={task.taskId} className="summary-item">
                  <span className="item-name">{task.taskTitle}</span>
                  <span className="item-value">{task.totalHours.toFixed(2)}h ({task.entryCount} entries)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'byUser' && (
          <div className="summary-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Total Hours</th>
                  <th>Entries</th>
                </tr>
              </thead>
              <tbody>
                {summary.byUser.map((user) => (
                  <tr key={user.userId}>
                    <td>{user.userName}</td>
                    <td>{user.totalHours.toFixed(2)}</td>
                    <td>{user.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'byTask' && (
          <div className="summary-table">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Total Hours</th>
                  <th>Entries</th>
                </tr>
              </thead>
              <tbody>
                {summary.byTask.map((task) => (
                  <tr key={task.taskId}>
                    <td>{task.taskTitle}</td>
                    <td>{task.totalHours.toFixed(2)}</td>
                    <td>{task.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'byDepartment' && (
          <div className="summary-table">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total Hours</th>
                  <th>Entries</th>
                </tr>
              </thead>
              <tbody>
                {summary.byDepartment.map((dept) => (
                  <tr key={dept.departmentId}>
                    <td>{dept.departmentName}</td>
                    <td>{dept.totalHours.toFixed(2)}</td>
                    <td>{dept.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'entries' && (
          <div className="entries-list">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Task</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {summary.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.startTime)}</td>
                    <td>{entry.userName}</td>
                    <td>{entry.taskTitle || 'N/A'}</td>
                    <td>
                      <span className={`entry-type-badge ${entry.entryType}`}>
                        {entry.entryType}
                      </span>
                    </td>
                    <td>{entry.durationHours.toFixed(2)}h</td>
                    <td>{entry.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTimeSummary;

