import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './InvitationsNotification.css';

interface Invitation {
  id: string;
  taskId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  task?: { id: string; title: string; orderId?: string };
  inviter?: { id: string; name: string; surname: string; email: string };
}

const InvitationsNotification: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInvitations();
      // Refresh every 30 seconds
      const interval = setInterval(fetchInvitations, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchInvitations = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      // Only fetch pending invitations
      const response = await fetch(`${API_BASE_URL}/api/invitations/my-invitations?status=pending`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show pending invitations (double-check)
        const pendingInvitations = data.filter((inv: Invitation) => inv.status === 'pending');
        setInvitations(pendingInvitations);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchInvitations();
        alert('Invitation accepted! You have been assigned to the task.');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      alert('Failed to accept invitation');
    }
  };

  const handleReject = async (invitationId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchInvitations();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject invitation');
      }
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      alert('Failed to reject invitation');
    }
  };

  if (!user || invitations.length === 0) {
    return null;
  }

  return (
    <div className="invitations-notification">
      <button
        className="invitations-bell"
        onClick={() => setShowNotifications(!showNotifications)}
        title={`${invitations.length} pending invitation${invitations.length > 1 ? 's' : ''}`}
      >
        🔔
        {invitations.length > 0 && <span className="invitations-badge">{invitations.length}</span>}
      </button>

      {showNotifications && (
        <>
          <div className="invitations-overlay" onClick={() => setShowNotifications(false)}></div>
          <div className="invitations-dropdown">
            <div className="invitations-header">
              <h3>Task Invitations ({invitations.length})</h3>
              <button onClick={() => setShowNotifications(false)} className="close-btn">×</button>
            </div>
            <div className="invitations-list">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="invitation-item">
                <div className="invitation-info">
                  <strong>
                    {invitation.inviter?.name} {invitation.inviter?.surname}
                  </strong>
                  {' invited you to work on '}
                  <strong>{invitation.task?.title || 'a task'}</strong>
                  {invitation.message && (
                    <p className="invitation-message">{invitation.message}</p>
                  )}
                  {invitation.task?.orderId && (
                    <Link
                      to={`/orders/${invitation.task.orderId}`}
                      onClick={() => setShowNotifications(false)}
                      className="invitation-link"
                    >
                      View Project →
                    </Link>
                  )}
                </div>
                <div className="invitation-actions">
                  <button
                    onClick={() => handleAccept(invitation.id)}
                    className="btn-accept"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(invitation.id)}
                    className="btn-reject"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InvitationsNotification;

