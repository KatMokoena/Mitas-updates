import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './RequisitionForm.css';

interface EquipmentItem {
  id: string;
  name: string;
  category: 'technology' | 'solution';
  quantity: number;
}

interface RequisitionFormData {
  orderId: string;
  items: EquipmentItem[];
  notes: string;
  approverIds: string[]; // Multiple approvers
}

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
}

interface RequisitionFormProps {
  orderId: string;
  equipmentItems: EquipmentItem[];
  onClose: () => void;
  onSuccess?: () => void;
}

const RequisitionForm: React.FC<RequisitionFormProps> = ({ orderId, equipmentItems, onClose, onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RequisitionFormData>({
    orderId,
    items: equipmentItems,
    notes: '',
    approverIds: [],
  });
  const [approvers, setApprovers] = useState<User[]>([]);
  const [itemAvailability, setItemAvailability] = useState<Record<string, 'available' | 'not_available' | 'partial'>>({});
  const [availabilityNotes, setAvailabilityNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProcurementForm, setShowProcurementForm] = useState<string | null>(null);
  const [procurementData, setProcurementData] = useState<Record<string, { itemName: string; itemCode: string; itemDescription: string; quantity: number; customerNumber: string; additionalCriteria?: string; taggedUsers: string[]; uploadedFile?: File | null }>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [orderInfo, setOrderInfo] = useState<{ customerName?: string; orderNumber?: string } | null>(null);
  const [savedProcurementDocs, setSavedProcurementDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [attachedDocuments, setAttachedDocuments] = useState<Array<{ file: File; label: string }>>([]);

  useEffect(() => {
    fetchApprovers();
    fetchAllUsers();
    fetchOrderInfo();
    fetchSavedProcurementDocuments();
  }, [orderId]);

  const fetchOrderInfo = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const order = await response.json();
        setOrderInfo({
          customerName: order.customerName,
          orderNumber: order.orderNumber,
        });
      }
    } catch (error) {
      console.error('Failed to fetch order info:', error);
    }
  };

  const fetchSavedProcurementDocuments = async () => {
    try {
      setLoadingDocs(true);
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/procurement-documents/${orderId}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const documents = await response.json();
        setSavedProcurementDocs(documents);
      }
    } catch (error) {
      console.error('Failed to fetch saved procurement documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDownloadSavedDocument = async (documentId: string, fileName: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/procurement-documents/${documentId}/download`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to download document');
      }
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const handleDownloadUploadedDocument = async (documentId: string, fileName: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/procurement-documents/${documentId}/download-uploaded`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to download uploaded document');
      }
    } catch (error) {
      console.error('Failed to download uploaded document:', error);
      alert('Failed to download uploaded document');
    }
  };

  const handleDownloadRequisitionDocument = async (documentId: string, fileName: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/documents/${documentId}/download`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to download document');
      }
    } catch (error) {
      console.error('Failed to download requisition document:', error);
      alert('Failed to download document');
    }
  };

  // Initialize itemAvailability when items change
  useEffect(() => {
    if (formData.items.length > 0) {
      const initialAvailability: Record<string, 'available' | 'not_available' | 'partial'> = {};
      formData.items.forEach(item => {
        if (!itemAvailability[item.id]) {
          initialAvailability[item.id] = 'not_available';
        }
      });
      if (Object.keys(initialAvailability).length > 0) {
        setItemAvailability(prev => ({ ...prev, ...initialAvailability }));
      }
    }
  }, [formData.items]);

  const fetchAllUsers = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const users = await response.json();
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchApprovers = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const users = await response.json();
        // Filter users with @tracesol.co.za email domain
        const tracesolUsers = users.filter((u: User) => 
          u.email && u.email.toLowerCase().endsWith('@tracesol.co.za')
        );
        setApprovers(tracesolUsers);
      }
    } catch (error) {
      console.error('Failed to fetch approvers:', error);
    }
  };

  const handleAvailabilityChange = (itemId: string, availability: 'available' | 'not_available' | 'partial') => {
    setItemAvailability(prev => ({
      ...prev,
      [itemId]: availability,
    }));
  };

  const handleAvailabilityNotesChange = (itemId: string, notes: string) => {
    setAvailabilityNotes(prev => ({
      ...prev,
      [itemId]: notes,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sessionId = localStorage.getItem('sessionId');
      
      // Prepare requisition items with availability
      const requisitionItems = formData.items.map(item => ({
        equipmentId: item.id,
        quantity: item.quantity,
        availability: itemAvailability[item.id] || 'not_available',
        availabilityNotes: availabilityNotes[item.id] || '',
      }));

      // Use FormData to support file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('orderId', formData.orderId);
      formDataToSend.append('items', JSON.stringify(requisitionItems));
      formDataToSend.append('notes', formData.notes || '');
      formDataToSend.append('approverIds', JSON.stringify(formData.approverIds));
      
      // Add attached documents with their labels
      attachedDocuments.forEach((doc) => {
        formDataToSend.append('documents', doc.file);
      });
      
      // Add document labels as JSON array (matching order with files)
      const documentLabels = attachedDocuments.map(doc => doc.label || doc.file.name);
      formDataToSend.append('documentLabels', JSON.stringify(documentLabels));

      const response = await fetch(`${API_BASE_URL}/api/requisitions`, {
        method: 'POST',
        headers: {
          'x-session-id': sessionId || '',
          // Don't set Content-Type header - browser will set it with boundary for FormData
        },
        body: formDataToSend,
      });

      if (response.ok) {
        // Refresh the documents list to show newly uploaded documents
        await fetchSavedProcurementDocuments();
        
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        try {
          const data = await response.json();
          setError(data.error || 'Failed to create requisition');
        } catch (parseError) {
          setError(`Failed to create requisition (Status: ${response.status})`);
        }
      }
    } catch (err) {
      console.error('Requisition creation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Failed to connect to server. Please ensure the API server is running on port 3001.');
      } else {
        setError(`Failed to create requisition: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="requisition-form-overlay" onClick={onClose}>
      <div className="requisition-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="requisition-form-header">
          <h2>Create Procurement Requisition</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="requisition-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>Selected Equipment</h3>
            <div className="equipment-list">
              {formData.items.map((item) => (
                <div key={item.id} className="equipment-item-row">
                  <div className="equipment-item-info">
                    <span className="equipment-name">{item.name}</span>
                    <span className="equipment-category">{item.category === 'technology' ? 'Technology' : 'Solution'}</span>
                    <span className="equipment-quantity">Qty: {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Availability Status</h3>
            <div className="availability-table">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Availability</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item) => {
                    const currentAvailability = itemAvailability[item.id] || 'not_available';
                    const showProcurementBtn = currentAvailability === 'not_available';
                    
                    return (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>
                          <select
                            value={currentAvailability}
                            onChange={(e) => handleAvailabilityChange(item.id, e.target.value as any)}
                            className="availability-select"
                          >
                            <option value="available">Available</option>
                            <option value="not_available">Not Available</option>
                            <option value="partial">Partial</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={availabilityNotes[item.id] || ''}
                              onChange={(e) => handleAvailabilityNotesChange(item.id, e.target.value)}
                              placeholder="Availability notes..."
                              className="availability-notes"
                              style={{ flex: 1, minWidth: '150px' }}
                            />
                            {showProcurementBtn && (
                              <button
                                type="button"
                              onClick={() => {
                                setShowProcurementForm(item.id);
                                if (!procurementData[item.id]) {
                                  setProcurementData({
                                    ...procurementData,
                                    [item.id]: {
                                      itemName: item.name,
                                      itemCode: '',
                                      itemDescription: item.name,
                                      quantity: item.quantity,
                                      customerNumber: '',
                                      additionalCriteria: '',
                                      taggedUsers: [],
                                      uploadedFile: null,
                                    },
                                  });
                                }
                              }}
                                className="btn-procurement"
                                style={{
                                  padding: '6px 12px',
                                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                Procurement
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-section">
            <h3>Saved Procurement Documents</h3>
            {loadingDocs ? (
              <p>Loading documents...</p>
            ) : savedProcurementDocs.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No procurement documents or uploaded files have been generated yet.</p>
            ) : (
              <div className="procurement-docs-list" style={{ marginTop: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Item Code</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Item Name</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Quantity</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Created</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedProcurementDocs.map((doc) => {
                      const isRequisitionDoc = doc.documentType === 'requisition';
                      const createdAt = doc.createdAt || doc.uploadedAt;
                      
                      return (
                        <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {isRequisitionDoc ? (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>N/A</span>
                            ) : (
                              doc.itemCode
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {isRequisitionDoc ? (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
                                  {doc.description || doc.itemName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  File: {doc.fileName}
                                </div>
                              </div>
                            ) : (
                              doc.itemName
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {isRequisitionDoc ? (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>N/A</span>
                            ) : (
                              doc.quantity
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                            {createdAt ? (
                              <>
                                {new Date(createdAt).toLocaleDateString()} {new Date(createdAt).toLocaleTimeString()}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {isRequisitionDoc ? (
                                // Requisition document - show single download button
                                <button
                                  type="button"
                                  onClick={() => handleDownloadRequisitionDocument(doc.id, doc.fileName)}
                                  className="btn-secondary"
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    background: '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={`Download Document: ${doc.fileName}`}
                                >
                                  Download Document
                                </button>
                              ) : (
                                // Procurement document - show Requisition PDF and optional Uploaded File buttons
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadSavedDocument(doc.id, doc.fileName)}
                                    className="btn-secondary"
                                    style={{
                                      padding: '0.5rem 1rem',
                                      fontSize: '0.875rem',
                                      background: '#3498DB',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Download Requisition PDF"
                                  >
                                    Requisition PDF
                                  </button>
                                  {doc.uploadedFileName && (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadUploadedDocument(doc.id, doc.uploadedFileName)}
                                      className="btn-secondary"
                                      style={{
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.875rem',
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title={`Download Uploaded Document: ${doc.uploadedFileName}`}
                                    >
                                      Uploaded File
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-section" style={{ 
            borderTop: '3px solid #f97316', 
            borderLeft: '4px solid #f97316',
            paddingTop: '24px', 
            paddingLeft: '20px',
            marginTop: '40px', 
            marginBottom: '30px',
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.2)'
          }}>
            <h3 style={{ 
              color: '#f97316', 
              fontSize: '22px', 
              fontWeight: 700, 
              marginBottom: '20px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>📎 Attach Documents (Optional)</h3>
            <div className="form-group">
              <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Upload Documents</label>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setAttachedDocuments(files.map(file => ({ file, label: file.name })));
                }}
                style={{
                  padding: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.3)',
                  color: 'var(--text-main)',
                  width: '100%',
                  fontSize: '14px',
                }}
              />
              {attachedDocuments.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <small style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Selected files ({attachedDocuments.length}) - Please provide a label for each document:
                  </small>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {attachedDocuments.map((doc, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{doc.file.name}</span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{(doc.file.size / 1024).toFixed(2)} KB</span>
                        </div>
                        <input
                          type="text"
                          value={doc.label}
                          onChange={(e) => {
                            const newDocs = [...attachedDocuments];
                            newDocs[index].label = e.target.value;
                            setAttachedDocuments(newDocs);
                          }}
                          placeholder="Enter a label/name for this document (e.g., 'Invoice', 'Contract', 'Specification')"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newDocs = attachedDocuments.filter((_, i) => i !== index);
                            setAttachedDocuments(newDocs);
                          }}
                          style={{
                            marginTop: '6px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Approval Routing</h3>
            <div className="form-group">
              <label>Select Approvers (users with @tracesol.co.za email)</label>
              <div className="approvers-list">
                {approvers.length === 0 ? (
                  <p className="no-approvers">No users with @tracesol.co.za email found</p>
                ) : (
                  approvers.map((approver) => (
                    <label key={approver.id} className="approver-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.approverIds.includes(approver.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              approverIds: [...formData.approverIds, approver.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              approverIds: formData.approverIds.filter(id => id !== approver.id),
                            });
                          }
                        }}
                        className="approver-checkbox"
                      />
                      <span className="approver-name">
                        {approver.name} {approver.surname} ({approver.email})
                      </span>
                    </label>
                  ))
                )}
              </div>
              {formData.approverIds.length === 0 && (
                <small className="error-text">At least one approver must be selected</small>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label>Additional Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Add any additional notes or comments..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || formData.approverIds.length === 0}>
              {loading ? 'Creating...' : 'Create Requisition'}
            </button>
          </div>
        </form>

        {/* Procurement Request Form Modal */}
        {showProcurementForm && (() => {
          const item = formData.items.find(i => i.id === showProcurementForm);
          const procurement = procurementData[showProcurementForm] || {
            itemName: item?.name || '',
            itemCode: '',
            itemDescription: item?.name || '',
            quantity: item?.quantity || 0,
            customerNumber: '',
            additionalCriteria: '',
            taggedUsers: [],
            uploadedFile: null,
          };

          return (
            <div className="procurement-form-overlay" onClick={() => setShowProcurementForm(null)}>
              <div className="procurement-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="procurement-form-header">
                  <h3>Procurement Request</h3>
                  <button onClick={() => setShowProcurementForm(null)} className="close-btn">×</button>
                </div>
                <div className="procurement-form-content">
                  <div className="form-group">
                    <label>Item Code *</label>
                    <input
                      type="text"
                      value={procurement.itemCode}
                      onChange={(e) => setProcurementData({
                        ...procurementData,
                        [showProcurementForm]: { ...procurement, itemCode: e.target.value },
                      })}
                      required
                      placeholder="Enter item code"
                    />
                  </div>
                  <div className="form-group">
                    <label>Item Description *</label>
                    <textarea
                      value={procurement.itemDescription}
                      onChange={(e) => setProcurementData({
                        ...procurementData,
                        [showProcurementForm]: { ...procurement, itemDescription: e.target.value },
                      })}
                      required
                      rows={3}
                      placeholder="Enter item description"
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={procurement.quantity}
                      onChange={(e) => setProcurementData({
                        ...procurementData,
                        [showProcurementForm]: { ...procurement, quantity: parseInt(e.target.value) || 0 },
                      })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Customer Number *</label>
                    <input
                      type="text"
                      value={procurement.customerNumber}
                      onChange={(e) => setProcurementData({
                        ...procurementData,
                        [showProcurementForm]: { ...procurement, customerNumber: e.target.value },
                      })}
                      required
                      placeholder="Enter customer number"
                    />
                    {orderInfo?.customerName && (
                      <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        Customer: {orderInfo.customerName}
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Additional Criteria (Optional)</label>
                    <textarea
                      value={procurement.additionalCriteria || ''}
                      onChange={(e) => setProcurementData({
                        ...procurementData,
                        [showProcurementForm]: { ...procurement, additionalCriteria: e.target.value },
                      })}
                      rows={3}
                      placeholder="Add any additional criteria or specifications..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Tag Users to View PDF (Optional)</label>
                    <div className="tagged-users-list">
                      {allUsers.map((u) => (
                        <label key={u.id} className="user-checkbox-label">
                          <input
                            type="checkbox"
                            checked={procurement.taggedUsers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setProcurementData({
                                  ...procurementData,
                                  [showProcurementForm]: {
                                    ...procurement,
                                    taggedUsers: [...procurement.taggedUsers, u.id],
                                  },
                                });
                              } else {
                                setProcurementData({
                                  ...procurementData,
                                  [showProcurementForm]: {
                                    ...procurement,
                                    taggedUsers: procurement.taggedUsers.filter(id => id !== u.id),
                                  },
                                });
                              }
                            }}
                          />
                          <span>{u.name} {u.surname} ({u.email})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Attach Document (Optional)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setProcurementData({
                          ...procurementData,
                          [showProcurementForm]: {
                            ...procurement,
                            uploadedFile: file,
                          },
                        });
                      }}
                      style={{
                        padding: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.3)',
                        color: 'var(--text-main)',
                        width: '100%',
                        fontSize: '14px',
                      }}
                    />
                    {procurement.uploadedFile && (
                      <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        Selected: {procurement.uploadedFile.name} ({(procurement.uploadedFile.size / 1024).toFixed(2)} KB)
                      </small>
                    )}
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setShowProcurementForm(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // Validate required fields
                        if (!procurement.itemCode || !procurement.itemDescription || !procurement.customerNumber) {
                          alert('Please fill in all required fields: Item Code, Item Description, and Customer Number');
                          return;
                        }

                        try {
                          const sessionId = localStorage.getItem('sessionId');
                          
                          // Use FormData to support file upload
                          const formData = new FormData();
                          formData.append('itemName', procurement.itemName);
                          formData.append('itemCode', procurement.itemCode);
                          formData.append('itemDescription', procurement.itemDescription);
                          formData.append('quantity', procurement.quantity.toString());
                          formData.append('customerNumber', procurement.customerNumber);
                          if (procurement.additionalCriteria) {
                            formData.append('additionalCriteria', procurement.additionalCriteria);
                          }
                          if (procurement.taggedUsers && procurement.taggedUsers.length > 0) {
                            formData.append('taggedUsers', JSON.stringify(procurement.taggedUsers));
                          }
                          formData.append('orderId', orderId);
                          
                          // Add file if selected
                          if (procurement.uploadedFile) {
                            formData.append('uploadedFile', procurement.uploadedFile);
                          }

                          const response = await fetch(`${API_BASE_URL}/api/requisitions/generate-procurement-pdf`, {
                            method: 'POST',
                            headers: {
                              'x-session-id': sessionId || '',
                              // Don't set Content-Type header - browser will set it with boundary for FormData
                            },
                            body: formData,
                          });

                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Procurement-Request-${procurement.itemCode}-${new Date().toISOString().split('T')[0]}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            alert('Procurement Request PDF generated and downloaded successfully!');
                            setShowProcurementForm(null);
                            // Clear the uploaded file from state
                            setProcurementData({
                              ...procurementData,
                              [showProcurementForm]: {
                                ...procurement,
                                uploadedFile: null,
                              },
                            });
                            // Refresh saved documents list
                            fetchSavedProcurementDocuments();
                          } else {
                            const data = await response.json();
                            const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to generate PDF';
                            alert(errorMsg);
                            console.error('PDF generation error:', data);
                          }
                        } catch (error) {
                          console.error('Failed to generate procurement PDF:', error);
                          const errorMsg = error instanceof Error ? error.message : 'Failed to generate PDF';
                          alert(`Failed to generate PDF: ${errorMsg}`);
                        }
                      }}
                      className="btn-primary"
                      disabled={!procurement.itemCode || !procurement.itemDescription || !procurement.customerNumber}
                    >
                      Generate & Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default RequisitionForm;

