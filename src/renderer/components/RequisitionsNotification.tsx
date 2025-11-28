import React, { useState, useEffect } from 'react';
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
        onClick={() => setShowNotifications(!showNotifications)}
        title={`${requisitions.length} pending requisition${requisitions.length > 1 ? 's' : ''}`}
      >
        📋
        {requisitions.length > 0 && <span className="invitations-badge">{requisitions.length}</span>}
      </button>

      {showNotifications && (
        <>
          <div className="invitations-overlay" onClick={() => setShowNotifications(false)}></div>
          <div className="invitations-dropdown">
            <div className="invitations-header">
              <h3>Requisition Approvals ({requisitions.length})</h3>
              <button onClick={() => setShowNotifications(false)} className="close-btn">×</button>
            </div>
            <div className="invitations-list">
              {requisitions.map((requisition) => (
                <div key={requisition.id} className="invitation-item">
                  <div className="invitation-info">
                    <strong>
                      {requisition.requester?.name} {requisition.requester?.surname}
                    </strong>
                    {' requested approval for requisition '}
                    <strong>Project {requisition.order?.orderNumber || requisition.orderId}</strong>
                    {requisition.order?.customerName && (
                      <p style={{ margin: '0.25rem 0', color: '#94a3b8' }}>
                        Project: {requisition.order.customerName}
                      </p>
                    )}
                    {requisition.items && requisition.items.length > 0 && (
                      <p style={{ margin: '0.25rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                        {requisition.items.length} item(s)
                      </p>
                    )}
                    {requisition.notes && (
                      <p className="invitation-message" style={{ marginTop: '0.5rem' }}>
                        {requisition.notes}
                      </p>
                    )}
                    {requisition.orderId && (
                      <Link
                        to={`/orders/${requisition.orderId}`}
                        onClick={() => setShowNotifications(false)}
                        className="invitation-link"
                      >
                        View Project →
                      </Link>
                    )}
                  </div>
                  <div className="invitation-actions">
                    <button
                      onClick={() => setShowApproveModal(requisition.id)}
                      className="btn-accept"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(requisition.id)}
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

      {showApproveModal && (
        <>
          <div className="invitations-overlay" onClick={() => {
            setShowApproveModal(null);
            setProofFile({ ...proofFile, [showApproveModal]: null });
            setProofDescription({ ...proofDescription, [showApproveModal]: '' });
          }}></div>
          <div className="invitations-dropdown" style={{ maxWidth: '500px', padding: '1rem' }}>
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
        </>
      )}

      {showRejectModal && (
        <>
          <div className="invitations-overlay" onClick={() => {
            setShowRejectModal(null);
            setRejectionReason({ ...rejectionReason, [showRejectModal]: '' });
          }}></div>
          <div className="invitations-dropdown" style={{ maxWidth: '400px', padding: '1rem' }}>
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
        </>
      )}
    </div>
  );
};

export default RequisitionsNotification;

