import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './InvitationsNotification.css';

interface Requisition {
  id: string;
  orderId: string;
  requestedBy: string;
  status: string;
  notes?: string;
  order?: { id: string; orderNumber: string; customerName: string };
  requester?: { id: string; name: string; surname: string; email: string };
  items?: Array<{ id: string; equipmentId: string; quantity: number }>;
}

const RequisitionsNotification: React.FC = () => {
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<Record<string, File | null>>({});
  const [proofDescription, setProofDescription] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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
      // Fetch pending requisitions for the current user
      const response = await fetch(`${API_BASE_URL}/api/requisitions/my-requisitions?status=pending`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setRequisitions(data);
      }
    } catch (error) {
      console.error('Failed to fetch requisitions:', error);
    }
  };

  const handleApprove = async (requisitionId: string) => {
    const file = proofFile[requisitionId];
    const description = proofDescription[requisitionId] || '';

    try {
      setUploading({ ...uploading, [requisitionId]: true });
      const sessionId = localStorage.getItem('sessionId');

      // If a file is provided, upload it first
      let proofId: string | undefined;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (description) {
          formData.append('description', description);
        }

        const uploadResponse = await fetch(`${API_BASE_URL}/api/requisitions/${requisitionId}/proof`, {
          method: 'POST',
          headers: { 'x-session-id': sessionId || '' },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          proofId = uploadData.id;
        } else {
          const errorData = await uploadResponse.json();
          alert(errorData.error || 'Failed to upload proof document');
          setUploading({ ...uploading, [requisitionId]: false });
          return;
        }
      }

      // Approve the requisition
      const response = await fetch(`${API_BASE_URL}/api/requisitions/${requisitionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (response.ok) {
        await fetchRequisitions();
        setShowApproveModal(null);
        setProofFile({ ...proofFile, [requisitionId]: null });
        setProofDescription({ ...proofDescription, [requisitionId]: '' });
        alert('Requisition approved successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve requisition');
      }
    } catch (error) {
      console.error('Failed to approve requisition:', error);
      alert('Failed to approve requisition');
    } finally {
      setUploading({ ...uploading, [requisitionId]: false });
    }
  };

  const handleReject = async (requisitionId: string) => {
    const reason = rejectionReason[requisitionId] || '';
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/${requisitionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejectionReason: reason,
        }),
      });

      if (response.ok) {
        await fetchRequisitions();
        setShowRejectModal(null);
        setRejectionReason({ ...rejectionReason, [requisitionId]: '' });
        alert('Requisition rejected');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject requisition');
      }
    } catch (error) {
      console.error('Failed to reject requisition:', error);
      alert('Failed to reject requisition');
    }
  };

  if (!user || requisitions.length === 0) {
    return null;
  }

  return (
    <div className="invitations-notification">
      <button
        className="invitations-bell"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('RequisitionsNotification clicked, current state:', showNotifications, 'toggling to:', !showNotifications);
          setShowNotifications(!showNotifications);
        }}
        title={`${requisitions.length} pending requisition${requisitions.length > 1 ? 's' : ''}`}
      >
        📋
        {requisitions.length > 0 && <span className="invitations-badge">{requisitions.length}</span>}
      </button>

      {showNotifications && requisitions.length > 0 && typeof document !== 'undefined' && document.body && createPortal(
        <>
          {console.log('Rendering RequisitionsNotification dropdown via Portal, requisitions:', requisitions.length)}
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
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, color: '#f1f5f9' }}>Requisition Approvals ({requisitions.length})</h3>
              <button onClick={() => setShowNotifications(false)} className="close-btn" style={{ fontSize: '1.5rem' }}>×</button>
            </div>
            <div className="invitations-list" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: 0, flex: 1 }}>
              {requisitions.map((requisition) => (
                <div key={requisition.id} className="invitation-item" style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div className="invitation-info" style={{ marginBottom: '0.75rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9', lineHeight: '1.5', fontSize: '0.875rem' }}>
                      <strong style={{ color: '#3498DB' }}>
                        {requisition.requester?.name} {requisition.requester?.surname}
                      </strong>
                      {' requested approval'}
                    </p>
                    {requisition.order?.orderNumber && (
                      <p style={{ margin: '0.25rem 0', color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>
                        {requisition.order.orderNumber}
                      </p>
                    )}
                    {requisition.order?.customerName && (
                      <p style={{ margin: '0.25rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                        Project: {requisition.order.customerName}
                      </p>
                    )}
                    {requisition.items && requisition.items.length > 0 && (
                      <p style={{ margin: '0.25rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                        {requisition.items.length} item(s)
                      </p>
                    )}
                    {requisition.notes && (
                      <p className="invitation-message" style={{ marginTop: '0.5rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}>
                        {requisition.notes}
                      </p>
                    )}
                    {requisition.orderId && (
                      <Link
                        to={`/orders/${requisition.orderId}`}
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
                      onClick={() => setShowApproveModal(requisition.id)}
                      className="btn-accept"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(requisition.id)}
                      className="btn-reject"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      {showApproveModal && typeof document !== 'undefined' && document.body && createPortal(
        <>
          <div 
            className="invitations-overlay" 
            onClick={() => {
              setShowApproveModal(null);
              setProofFile({ ...proofFile, [showApproveModal]: null });
              setProofDescription({ ...proofDescription, [showApproveModal]: '' });
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
              width: '500px',
              maxHeight: 'calc(100vh - 100px)',
              minHeight: 'auto',
              padding: '1rem',
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
            <div className="invitations-header">
              <h3>Approve Requisition</h3>
              <button 
                onClick={() => {
                  setShowApproveModal(null);
                  setProofFile({ ...proofFile, [showApproveModal]: null });
                  setProofDescription({ ...proofDescription, [showApproveModal]: '' });
                }} 
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f1f5f9' }}>
                Upload Proof Document (Optional):
                <span style={{ fontSize: '0.875rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                  PDF, screenshot, or other file
                </span>
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setProofFile({ ...proofFile, [showApproveModal]: file });
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f1f5f9',
                  fontFamily: 'inherit',
                  marginBottom: '0.5rem',
                }}
              />
              {proofFile[showApproveModal] && (
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Selected: {proofFile[showApproveModal]?.name} ({(proofFile[showApproveModal]?.size || 0) / 1024} KB)
                </p>
              )}
              <label style={{ display: 'block', marginBottom: '0.5rem', marginTop: '1rem', color: '#f1f5f9' }}>
                Description (Optional):
              </label>
              <textarea
                value={proofDescription[showApproveModal] || ''}
                onChange={(e) => setProofDescription({
                  ...proofDescription,
                  [showApproveModal]: e.target.value,
                })}
                placeholder="e.g., Stock checked in SAP, items available..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f1f5f9',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowApproveModal(null);
                    setProofFile({ ...proofFile, [showApproveModal]: null });
                    setProofDescription({ ...proofDescription, [showApproveModal]: '' });
                  }}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem' }}
                  disabled={uploading[showApproveModal]}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprove(showApproveModal)}
                  className="btn-accept"
                  style={{ padding: '0.5rem 1rem' }}
                  disabled={uploading[showApproveModal]}
                >
                  {uploading[showApproveModal] ? 'Uploading...' : 'Confirm Approve'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {showRejectModal && typeof document !== 'undefined' && document.body && createPortal(
        <>
          <div 
            className="invitations-overlay" 
            onClick={() => {
              setShowRejectModal(null);
              setRejectionReason({ ...rejectionReason, [showRejectModal]: '' });
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
              padding: '1rem',
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
            <div className="invitations-header">
              <h3>Reject Requisition</h3>
              <button 
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason({ ...rejectionReason, [showRejectModal]: '' });
                }} 
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f1f5f9' }}>
                Reason for rejection:
              </label>
              <textarea
                value={rejectionReason[showRejectModal] || ''}
                onChange={(e) => setRejectionReason({
                  ...rejectionReason,
                  [showRejectModal]: e.target.value,
                })}
                placeholder="Enter rejection reason..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f1f5f9',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason({ ...rejectionReason, [showRejectModal]: '' });
                  }}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  className="btn-reject"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default RequisitionsNotification;

