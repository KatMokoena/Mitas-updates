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

  useEffect(() => {
    fetchApprovers();
  }, []);

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

      const response = await fetch(`${API_BASE_URL}/api/requisitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          orderId: formData.orderId,
          items: requisitionItems,
          notes: formData.notes,
          approverIds: formData.approverIds,
        }),
      });

      if (response.ok) {
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
                  {formData.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <select
                          value={itemAvailability[item.id] || 'not_available'}
                          onChange={(e) => handleAvailabilityChange(item.id, e.target.value as any)}
                          className="availability-select"
                        >
                          <option value="available">Available</option>
                          <option value="not_available">Not Available</option>
                          <option value="partial">Partial</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={availabilityNotes[item.id] || ''}
                          onChange={(e) => handleAvailabilityNotesChange(item.id, e.target.value)}
                          placeholder="Availability notes..."
                          className="availability-notes"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      </div>
    </div>
  );
};

export default RequisitionForm;

