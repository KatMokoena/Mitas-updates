import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './InvitationsNotification.css';

interface RequisitionStatus {
  id: string;
  orderId: string;
  status: string;
  rejectionReason?: string;
  taskAssignmentEnabled: boolean;
  order?: { id: string; orderNumber: string; customerName: string };
}

const RequisitionStatusNotification: React.FC = () => {
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<RequisitionStatus[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequisitions();
      // Refresh every 30 seconds
      const interval = setInterval(fetchRequisitions, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchRequisitions = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      // Fetch requisitions created by current user that have status updates (unviewed only)
      const response = await fetch(`${API_BASE_URL}/api/requisitions/my-created-requisitions`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        // Show only approved or rejected requisitions (status updates)
        // Note: API already filters out viewed notifications (requesterViewedAt is null)
        const statusUpdates = data.filter((req: RequisitionStatus) => 
          req.status === 'approved' || req.status === 'rejected'
        );
        console.log('RequisitionStatusNotification: Fetched', statusUpdates.length, 'status updates', statusUpdates);
        setRequisitions(statusUpdates);
      } else {
        console.error('RequisitionStatusNotification: Failed to fetch, status:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch requisition status:', error);
    }
  };

  const markAsViewed = async (requisitionId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/${requisitionId}/mark-viewed`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
      });

      if (response.ok) {
        // Remove from local state and refresh list
        setRequisitions(prev => prev.filter(req => req.id !== requisitionId));
        // Refresh the list to get updated count
        await fetchRequisitions();
      }
    } catch (error) {
      console.error('Failed to mark requisition as viewed:', error);
    }
  };

  if (!user) {
    return null;
  }

  // Don't hide the button even if no requisitions - user might want to check
  // But only show dropdown if there are requisitions
  console.log('RequisitionStatusNotification render: showNotifications =', showNotifications, 'requisitions =', requisitions.length, 'user =', user?.id);

  return (
    <div className="invitations-notification">
      <button
        className="invitations-bell"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('RequisitionStatusNotification clicked, current state:', showNotifications, 'toggling to:', !showNotifications);
          setShowNotifications(!showNotifications);
        }}
        title={`${requisitions.length} requisition status update${requisitions.length > 1 ? 's' : ''}`}
      >
        📬
        {requisitions.length > 0 && <span className="invitations-badge">{requisitions.length}</span>}
      </button>

      {showNotifications && requisitions.length > 0 && typeof document !== 'undefined' && document.body && createPortal(
        <>
          {console.log('Rendering RequisitionStatusNotification dropdown via Portal, requisitions:', requisitions, 'showNotifications:', showNotifications)}
          <div 
            className="invitations-overlay" 
            onClick={() => {
              console.log('Overlay clicked, closing notifications');
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
            onClick={(e) => e.stopPropagation()}
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
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, color: '#f1f5f9' }}>Requisition Status Updates ({requisitions.length})</h3>
              <button onClick={() => setShowNotifications(false)} className="close-btn" style={{ fontSize: '1.5rem' }}>×</button>
            </div>
            <div className="invitations-list" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '0', flex: 1 }}>
              {requisitions.map((requisition) => (
                <div 
                  key={requisition.id} 
                  className="invitation-item"
                  onClick={() => markAsViewed(requisition.id)}
                  style={{ cursor: 'pointer', padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="invitation-info" style={{ marginBottom: '0.75rem' }}>
                    {requisition.status === 'approved' ? (
                      <>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9', lineHeight: '1.5', fontSize: '0.875rem' }}>
                          <strong style={{ color: '#2ECC71' }}>✓ Approved</strong>
                          {' - Your requisition for '}
                          <strong style={{ color: '#3498DB' }}>Project {requisition.order?.orderNumber || requisition.orderId}</strong>
                          {' has been approved'}
                        </p>
                        {requisition.order?.customerName && (
                          <p style={{ margin: '0.25rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                            Project: {requisition.order.customerName}
                          </p>
                        )}
                        {!requisition.taskAssignmentEnabled && (
                          <p style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                            Click "Enable Task Assignment" on the project page to start creating tasks.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9', lineHeight: '1.5', fontSize: '0.875rem' }}>
                          <strong style={{ color: '#E74C3C' }}>✗ Rejected</strong>
                          {' - Your requisition for '}
                          <strong style={{ color: '#3498DB' }}>Project {requisition.order?.orderNumber || requisition.orderId}</strong>
                          {' has been rejected'}
                        </p>
                        {requisition.order?.customerName && (
                          <p style={{ margin: '0.25rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                            Project: {requisition.order.customerName}
                          </p>
                        )}
                        {requisition.rejectionReason && (
                          <p className="invitation-message" style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', color: '#94a3b8', fontSize: '0.875rem' }}>
                            Reason: {requisition.rejectionReason}
                          </p>
                        )}
                      </>
                    )}
                    {requisition.orderId && (
                      <Link
                        to={`/orders/${requisition.orderId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsViewed(requisition.id);
                          setShowNotifications(false);
                        }}
                        className="invitation-link"
                        style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.875rem' }}
                      >
                        View Project →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default RequisitionStatusNotification;

