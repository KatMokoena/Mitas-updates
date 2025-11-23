import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { OrderStatus, OrderPriority } from '../../shared/types';
import './CreateOrder.css';

interface EquipmentSelection {
  [equipmentId: string]: number; // equipmentId -> quantity
}

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    orderNumber: '',
    customerName: '',
    description: '',
    deadline: '',
    priority: OrderPriority.MEDIUM,
    status: OrderStatus.PENDING,
    equipmentIds: [] as string[],
  });
  const [equipmentSelections, setEquipmentSelections] = useState<EquipmentSelection>({});
  const [equipment, setEquipment] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/resources`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only equipment with category 'technology' or 'solution'
        const equipmentOnly = data.filter((r: any) => 
          r.type === 'equipment' && (r.category === 'technology' || r.category === 'solution')
        );
        setEquipment(equipmentOnly);
      }
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    }
  };

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    setEquipmentSelections(prev => {
      const updated = { ...prev };
      if (checked) {
        updated[equipmentId] = updated[equipmentId] || 1; // Default to 1 if not set
      } else {
        delete updated[equipmentId];
      }
      return updated;
    });
  };

  const handleQuantityChange = (equipmentId: string, quantity: number) => {
    if (quantity < 1) return;
    setEquipmentSelections(prev => ({
      ...prev,
      [equipmentId]: quantity,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sessionId = localStorage.getItem('sessionId');
      // Convert equipment selections to equipmentIds array (for backward compatibility)
      // You may want to update the API to accept quantities in the future
      const equipmentIds = Object.keys(equipmentSelections).filter(id => equipmentSelections[id] > 0);
      
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          ...formData,
          deadline: new Date(formData.deadline).toISOString(),
          equipmentIds: equipmentIds,
          equipmentQuantities: equipmentSelections, // Include quantities for future use
        }),
      });

      if (response.ok) {
        const order = await response.json();
        navigate(`/orders/${order.id}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-order">
      <div className="create-order-header">
        <h1>Create New Project</h1>
        <button onClick={() => navigate('/orders')} className="btn-cancel">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="create-order-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="orderNumber">Project Number / Reference *</label>
          <input
            id="orderNumber"
            type="text"
            value={formData.orderNumber}
            onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
            required
            placeholder="e.g., ORD-2024-001"
          />
        </div>

        <div className="form-group">
          <label htmlFor="customerName">Client / Customer Name *</label>
          <input
            id="customerName"
            type="text"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
            placeholder="Enter client name"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="deadline">Target Deadline *</label>
            <input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority *</label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as OrderPriority })}
              required
            >
              <option value={OrderPriority.LOW}>Low</option>
              <option value={OrderPriority.MEDIUM}>Medium</option>
              <option value={OrderPriority.HIGH}>High</option>
              <option value={OrderPriority.URGENT}>Urgent</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            placeholder="Enter project description or requirements..."
          />
        </div>

        <div className="form-group">
          <label>Required Solution & Equipment (optional)</label>
          <div className="equipment-tables-container">
            {/* Track & Trace Technology Table */}
            <div className="equipment-table-wrapper">
              <table className="equipment-table">
                <thead>
                  <tr>
                    <th colSpan={3} className="table-title-header tech-header">
                      Track & Trace Technology
                    </th>
                  </tr>
                  <tr className="sub-header">
                    <th className="items-col">Items</th>
                    <th className="select-col">Select</th>
                    <th className="quantity-col">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment
                    .filter((eq) => eq.category === 'technology')
                    .map((tech) => (
                      <tr key={tech.id}>
                        <td className="items-col">{tech.name}</td>
                        <td className="select-col">
                          <input
                            type="checkbox"
                            checked={!!equipmentSelections[tech.id] && equipmentSelections[tech.id] > 0}
                            onChange={(e) => handleEquipmentToggle(tech.id, e.target.checked)}
                            className="equipment-checkbox"
                          />
                        </td>
                        <td className="quantity-col">
                          {equipmentSelections[tech.id] > 0 ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={equipmentSelections[tech.id] || 1}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                if (value) {
                                  handleQuantityChange(tech.id, parseInt(value) || 1);
                                }
                              }}
                              className="equipment-quantity"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  {/* Add empty rows to make 10 rows total */}
                  {Array.from({ length: Math.max(0, 10 - equipment.filter(eq => eq.category === 'technology').length) }, (_, index) => (
                    <tr key={`empty-tech-${index}`}>
                      <td className="items-col"></td>
                      <td className="select-col">
                        <input type="checkbox" className="equipment-checkbox" disabled />
                      </td>
                      <td className="quantity-col"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Track & Trace Solution Table */}
            <div className="equipment-table-wrapper">
              <table className="equipment-table">
                <thead>
                  <tr>
                    <th colSpan={3} className="table-title-header solution-header">
                      Track & Trace Solution
                    </th>
                  </tr>
                  <tr className="sub-header">
                    <th className="items-col">Items</th>
                    <th className="select-col">Select</th>
                    <th className="quantity-col">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment
                    .filter((eq) => eq.category === 'solution')
                    .map((solution) => (
                      <tr key={solution.id}>
                        <td className="items-col">{solution.name}</td>
                        <td className="select-col">
                          <input
                            type="checkbox"
                            checked={!!equipmentSelections[solution.id] && equipmentSelections[solution.id] > 0}
                            onChange={(e) => handleEquipmentToggle(solution.id, e.target.checked)}
                            className="equipment-checkbox"
                          />
                        </td>
                        <td className="quantity-col">
                          {equipmentSelections[solution.id] > 0 ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={equipmentSelections[solution.id] || 1}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                if (value) {
                                  handleQuantityChange(solution.id, parseInt(value) || 1);
                                }
                              }}
                              className="equipment-quantity"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  {/* Add empty rows to make 10 rows total */}
                  {Array.from({ length: Math.max(0, 10 - equipment.filter(eq => eq.category === 'solution').length) }, (_, index) => (
                    <tr key={`empty-solution-${index}`}>
                      <td className="items-col"></td>
                      <td className="select-col">
                        <input type="checkbox" className="equipment-checkbox" disabled />
                      </td>
                      <td className="quantity-col"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/orders')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrder;




