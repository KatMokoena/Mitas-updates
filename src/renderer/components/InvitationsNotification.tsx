import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

interface ProjectOwnershipInvitation {
  id: string;
  projectId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  project?: { id: string; title: string };
  inviter?: { id: string; name: string; surname: string; email: string };
}

interface OrderOwnershipInvitation {
  id: string;
  orderId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  order?: { id: string; orderNumber: string };
  inviter?: { id: string; name: string; surname: string; email: string };
}

const InvitationsNotification: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [ownershipInvitations, setOwnershipInvitations] = useState<ProjectOwnershipInvitation[]>([]);
  const [orderOwnershipInvitations, setOrderOwnershipInvitations] = useState<OrderOwnershipInvitation[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInvitations();
      fetchOwnershipInvitations();
      fetchOrderOwnershipInvitations();
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchInvitations();
        fetchOwnershipInvitations();
        fetchOrderOwnershipInvitations();
      }, 30000);
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
        console.log('[InvitationsNotification] Fetched task invitations:', pendingInvitations.length);
      } else {
        console.error('[InvitationsNotification] Failed to fetch invitations, status:', response.status);
      }
    } catch (error) {
      console.error('[InvitationsNotification] Failed to fetch invitations:', error);
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

  const fetchOwnershipInvitations = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects/ownership-invitations/my-invitations?status=pending`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        const pendingInvitations = data.filter((inv: ProjectOwnershipInvitation) => inv.status === 'pending');
        setOwnershipInvitations(pendingInvitations);
        console.log('[InvitationsNotification] Fetched project ownership invitations:', pendingInvitations.length);
      } else {
        console.error('[InvitationsNotification] Failed to fetch ownership invitations, status:', response.status);
      }
    } catch (error) {
      console.error('[InvitationsNotification] Failed to fetch ownership invitations:', error);
    }
  };

  const handleAcceptOwnership = async (invitationId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects/ownership-invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchOwnershipInvitations();
        alert('Ownership transfer accepted! You are now the project owner.');
        // Refresh the page to update UI
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to accept ownership transfer');
      }
    } catch (error) {
      console.error('Failed to accept ownership transfer:', error);
      alert('Failed to accept ownership transfer');
    }
  };

  const handleRejectOwnership = async (invitationId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects/ownership-invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchOwnershipInvitations();
        alert('Ownership transfer invitation rejected. The current owner has been notified.');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject ownership transfer');
      }
    } catch (error) {
      console.error('Failed to reject ownership transfer:', error);
      alert('Failed to reject ownership transfer');
    }
  };

  const fetchOrderOwnershipInvitations = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/ownership-invitations/my-invitations?status=pending`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        const pendingInvitations = data.filter((inv: OrderOwnershipInvitation) => inv.status === 'pending');
        setOrderOwnershipInvitations(pendingInvitations);
        console.log('[InvitationsNotification] Fetched order ownership invitations:', pendingInvitations.length);
      } else {
        console.error('[InvitationsNotification] Failed to fetch order ownership invitations, status:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[InvitationsNotification] Error response:', errorText);
      }
    } catch (error) {
      console.error('[InvitationsNotification] Failed to fetch order ownership invitations:', error);
    }
  };

  const handleAcceptOrderOwnership = async (invitationId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/ownership-invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchOrderOwnershipInvitations();
        alert('Ownership transfer accepted! You are now the order owner.');
        // Refresh the page to update UI
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to accept ownership transfer');
      }
    } catch (error) {
      console.error('Failed to accept ownership transfer:', error);
      alert('Failed to accept ownership transfer');
    }
  };

  const handleRejectOrderOwnership = async (invitationId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/ownership-invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchOrderOwnershipInvitations();
        alert('Ownership transfer invitation rejected. The current owner has been notified.');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject ownership transfer');
      }
    } catch (error) {
      console.error('Failed to reject ownership transfer:', error);
      alert('Failed to reject ownership transfer');
    }
  };

  const totalInvitations = invitations.length + ownershipInvitations.length + orderOwnershipInvitations.length;

  // Debug logging
  useEffect(() => {
    console.log('[InvitationsNotification] State update:', {
      invitations: invitations.length,
      ownershipInvitations: ownershipInvitations.length,
      orderOwnershipInvitations: orderOwnershipInvitations.length,
      totalInvitations,
      showNotifications,
      user: user?.id,
      hasDocument: typeof document !== 'undefined',
      hasBody: typeof document !== 'undefined' && !!document.body
    });
  }, [invitations, ownershipInvitations, orderOwnershipInvitations, totalInvitations, showNotifications, user]);

  if (!user) {
    return null;
  }

  // Always show the bell if user exists, even if no invitations (for debugging)
  const shouldShowModal = showNotifications && typeof document !== 'undefined' && document.body;

  return (
    <div className="invitations-notification">
      <button
        className="invitations-bell"
        onClick={() => {
          console.log('[InvitationsNotification] Bell clicked, current state:', {
            showNotifications,
            totalInvitations,
            invitations: invitations.length,
            ownershipInvitations: ownershipInvitations.length,
            orderOwnershipInvitations: orderOwnershipInvitations.length
          });
          setShowNotifications(!showNotifications);
        }}
        title={`${totalInvitations} pending invitation${totalInvitations > 1 ? 's' : ''}`}
      >
        🔔
        {totalInvitations > 0 && <span className="invitations-badge">{totalInvitations}</span>}
      </button>

      {shouldShowModal && (() => {
        console.log('[InvitationsNotification] Rendering modal portal:', {
          showNotifications,
          totalInvitations,
          shouldShowModal,
          hasDocument: !!document,
          hasBody: !!document.body,
          invitations: invitations.length,
          ownershipInvitations: ownershipInvitations.length,
          orderOwnershipInvitations: orderOwnershipInvitations.length
        });
        return createPortal(
        <>
          <div 
            className="invitations-overlay" 
            onClick={() => {
              console.log('[InvitationsNotification] Overlay clicked, closing modal');
              setShowNotifications(false);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999998,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              pointerEvents: 'auto'
            }}
          ></div>
          <div 
            className="invitations-dropdown invitations-modal"
            onClick={(e) => {
              console.log('[InvitationsNotification] Modal clicked, stopping propagation');
              e.stopPropagation();
            }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bottom: 'auto',
              right: 'auto',
              zIndex: 999999,
              visibility: 'visible',
              opacity: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '400px',
              maxHeight: 'calc(100vh - 100px)',
              minHeight: 'auto',
              padding: 0,
              background: '#1B2A41',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
              pointerEvents: 'auto',
              color: '#f1f5f9',
              fontFamily: 'inherit'
            }}
          >
            <div className="invitations-header" style={{ padding: '1rem', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, color: '#f1f5f9' }}>Invitations ({totalInvitations})</h3>
              <button onClick={() => setShowNotifications(false)} className="close-btn" style={{ fontSize: '1.5rem' }}>×</button>
            </div>
            <div className="invitations-list" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: 0, flex: 1 }}>
            {orderOwnershipInvitations.map((invitation) => (
              <div key={invitation.id} className="invitation-item" style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(139, 92, 246, 0.1)' }}>
                <div className="invitation-info" style={{ marginBottom: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9', lineHeight: '1.5', fontSize: '0.875rem' }}>
                    <strong style={{ color: '#a78bfa' }}>
                      {invitation.inviter?.name} {invitation.inviter?.surname}
                    </strong>
                    {' wants to transfer order ownership to you: '}
                    <strong style={{ color: '#a78bfa' }}>{invitation.order?.orderNumber || 'an order'}</strong>
                  </p>
                  {invitation.message && (
                    <p className="invitation-message" style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', fontSize: '0.875rem' }}>
                      {invitation.message}
                    </p>
                  )}
                  {invitation.order?.id && (
                    <Link
                      to={`/orders/${invitation.order.id}`}
                      onClick={() => setShowNotifications(false)}
                      className="invitation-link"
                      style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.875rem' }}
                    >
                      View Order →
                    </Link>
                  )}
                </div>
                <div className="invitation-actions" style={{ marginTop: '0.75rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleAcceptOrderOwnership(invitation.id)}
                    className="btn-accept"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectOrderOwnership(invitation.id)}
                    className="btn-reject"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {ownershipInvitations.map((invitation) => (
              <div key={invitation.id} className="invitation-item" style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(139, 92, 246, 0.1)' }}>
                <div className="invitation-info" style={{ marginBottom: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9', lineHeight: '1.5', fontSize: '0.875rem' }}>
                    <strong style={{ color: '#a78bfa' }}>
                      {invitation.inviter?.name} {invitation.inviter?.surname}
                    </strong>
                    {' wants to transfer project ownership to you: '}
                    <strong style={{ color: '#a78bfa' }}>{invitation.project?.title || 'a project'}</strong>
                  </p>
                  {invitation.message && (
                    <p className="invitation-message" style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', fontSize: '0.875rem' }}>
                      {invitation.message}
                    </p>
                  )}
                  {invitation.project?.id && (
                    <Link
                      to={`/projects/${invitation.project.id}`}
                      onClick={() => setShowNotifications(false)}
                      className="invitation-link"
                      style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.875rem' }}
                    >
                      View Project →
                    </Link>
                  )}
                </div>
                <div className="invitation-actions" style={{ marginTop: '0.75rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleAcceptOwnership(invitation.id)}
                    className="btn-accept"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectOwnership(invitation.id)}
                    className="btn-reject"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {invitations.map((invitation) => (
              <div key={invitation.id} className="invitation-item" style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="invitation-info" style={{ marginBottom: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9', lineHeight: '1.5', fontSize: '0.875rem' }}>
                    <strong style={{ color: '#3498DB' }}>
                      {invitation.inviter?.name} {invitation.inviter?.surname}
                    </strong>
                    {' invited you to work on '}
                    <strong style={{ color: '#3498DB' }}>{invitation.task?.title || 'a task'}</strong>
                  </p>
                  {invitation.message && (
                    <p className="invitation-message" style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', fontSize: '0.875rem' }}>
                      {invitation.message}
                    </p>
                  )}
                  {invitation.task?.orderId && (
                    <Link
                      to={`/orders/${invitation.task.orderId}`}
                      onClick={() => setShowNotifications(false)}
                      className="invitation-link"
                      style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.875rem' }}
                    >
                      View Project →
                    </Link>
                  )}
                </div>
                <div className="invitation-actions" style={{ marginTop: '0.75rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleAccept(invitation.id)}
                    className="btn-accept"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(invitation.id)}
                    className="btn-reject"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {totalInvitations === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No pending invitations</p>
              </div>
            )}
            </div>
          </div>
        </>,
        document.body
        );
      })()}
    </div>
  );
};

export default InvitationsNotification;

