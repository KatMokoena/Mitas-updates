import React, { useState, useEffect } from 'react';
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
        setRequisitions(statusUpdates);
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

  if (!user || requisitions.length === 0) {
    return null;
  }

  return (
    <div className="invitations-notification">
      <button
        className="invitations-bell"
        onClick={() => setShowNotifications(!showNotifications)}
        title={`${requisitions.length} requisition status update${requisitions.length > 1 ? 's' : ''}`}
      >
        📬
        {requisitions.length > 0 && <span className="invitations-badge">{requisitions.length}</span>}
      </button>

      {showNotifications && (
        <>
          <div className="invitations-overlay" onClick={() => setShowNotifications(false)}></div>
          <div className="invitations-dropdown">
            <div className="invitations-header">
              <h3>Requisition Status Updates ({requisitions.length})</h3>
              <button onClick={() => setShowNotifications(false)} className="close-btn">×</button>
            </div>
            <div className="invitations-list">
              {requisitions.map((requisition) => (
                <div 
                  key={requisition.id} 
                  className="invitation-item"
                  onClick={() => markAsViewed(requisition.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="invitation-info">
                    {requisition.status === 'approved' ? (
                      <>
                        <strong style={{ color: '#2ECC71' }}>✓ Approved</strong>
                        {' - Your requisition for '}
                        <strong>Order {requisition.order?.orderNumber || requisition.orderId}</strong>
                        {' has been approved'}
                        {!requisition.taskAssignmentEnabled && (
                          <p style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                            Click "Enable Task Assignment" on the order page to start creating tasks.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <strong style={{ color: '#E74C3C' }}>✗ Rejected</strong>
                        {' - Your requisition for '}
                        <strong>Order {requisition.order?.orderNumber || requisition.orderId}</strong>
                        {' has been rejected'}
                        {requisition.rejectionReason && (
                          <p className="invitation-message" style={{ marginTop: '0.5rem' }}>
                            Reason: {requisition.rejectionReason}
                          </p>
                        )}
                      </>
                    )}
                    {requisition.orderId && (
                      <Link
                        to={`/orders/${requisition.orderId}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent marking as viewed twice
                          markAsViewed(requisition.id);
                          setShowNotifications(false);
                        }}
                        className="invitation-link"
                      >
                        View Order →
                      </Link>
                    )}
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

export default RequisitionStatusNotification;

