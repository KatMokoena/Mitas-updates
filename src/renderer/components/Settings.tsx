import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Department } from '../../shared/types';
import { ALL_CLIFTON_STRENGTHS, STRENGTH_DETAILS } from '../../shared/cliftonStrengths';
import './Settings.css';

interface Resource {
  id: string;
  name: string;
  type: 'labour' | 'equipment';
  category?: 'technology' | 'solution';
  allocatedTaskIds?: string[];
}

type TabType = 'departments' | 'equipment' | 'configurations' | 'cliftonStrengths';
type EquipmentSubTabType = 'technologies' | 'solutions';

interface Configuration {
  id: string;
  role: string;
  allowedRoutes: string[];
  permissions?: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

// Available routes/pages that can be configured
const AVAILABLE_ROUTES = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'orders', label: 'Projects' },
  { value: 'all-projects-gantt', label: 'Overview Gantt Chart' },
  { value: 'users', label: 'Users' },
  { value: 'settings', label: 'Settings' },
];

// Pre-defined technologies and solutions
const PREDEFINED_TECHNOLOGIES = [
  'Laser Marking',
  'Dot Peen Marking',
  'Scribe Marking',
  'Heavy Duty Marking',
  'Continuous Inkjet',
  'Thermal Inkjet',
  'High-Resolution Large Character Printing',
  'Labellers & Labelling',
  'Inspection & Rejection',
  'Custom Automation & Integration',
  'IoT Solutions',
  'Logistics Automation',
  'Overt & Covert Solutions',
];

const PREDEFINED_SOLUTIONS = [
  'Production Monitoring System',
  'Cross Pack Checking',
  'Vision Inspection',
  'Serialisation with Aggregation from L1 to L2',
  'Baggage Handling Solutions',
  'Tax Stamp Programs',
  'Direct Digital Tax Stamping',
  'Inspection, Rejection, and Quality Control Solutions',
];

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('departments');
  const [equipmentSubTab, setEquipmentSubTab] = useState<EquipmentSubTabType>('technologies');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [equipment, setEquipment] = useState<Resource[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [savingConfig, setSavingConfig] = useState<string | null>(null);

  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptFormData, setDeptFormData] = useState({ name: '', description: '' });

  // Equipment modal state
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Resource | null>(null);
  const [equipFormData, setEquipFormData] = useState({ 
    name: '', 
    type: 'equipment' as 'labour' | 'equipment',
    category: 'technology' as 'technology' | 'solution' | undefined
  });

  // CliftonStrengths state
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; name?: string; surname?: string }>>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [userStrengths, setUserStrengths] = useState<string[]>(['', '', '', '', '', '']);
  const [allStrengthsData, setAllStrengthsData] = useState<Array<any>>([]);

  useEffect(() => {
    // If component renders, user has permission to access settings (checked by ProtectedRoute)
    fetchDepartments();
    fetchEquipment();
    fetchConfigurations();
    if (user && (user.role === 'ADMIN' || user.role === 'admin')) {
      fetchAllUsers();
      fetchAllStrengths();
    }
    setLoading(false);
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/departments`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/resources`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to only show equipment (not labour)
        const equipmentOnly = data.filter((r: Resource) => r.type === 'equipment');
        setEquipment(equipmentOnly);
        
        // Pre-populate if empty
        if (equipmentOnly.length === 0) {
          await initializePredefinedEquipment();
        }
      }
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    }
  };

  const initializePredefinedEquipment = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      
      // Create technologies
      for (const techName of PREDEFINED_TECHNOLOGIES) {
        await fetch(`${API_BASE_URL}/api/resources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId || '',
          },
          body: JSON.stringify({
            name: techName,
            type: 'equipment',
            category: 'technology',
            allocatedTaskIds: [],
          }),
        });
      }

      // Create solutions
      for (const solName of PREDEFINED_SOLUTIONS) {
        await fetch(`${API_BASE_URL}/api/resources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId || '',
          },
          body: JSON.stringify({
            name: solName,
            type: 'equipment',
            category: 'solution',
            allocatedTaskIds: [],
          }),
        });
      }

      // Refresh the list
      await fetchEquipment();
    } catch (error) {
      console.error('Failed to initialize predefined equipment:', error);
    }
  };

  const handleCreateDept = () => {
    setEditingDept(null);
    setDeptFormData({ name: '', description: '' });
    setShowDeptModal(true);
  };

  const handleEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptFormData({ name: dept.name, description: dept.description || '' });
    setShowDeptModal(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionId = localStorage.getItem('sessionId');
      const url = editingDept
        ? `${API_BASE_URL}/api/departments/${editingDept.id}`
        : `${API_BASE_URL}/api/departments`;

      const response = await fetch(url, {
        method: editingDept ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify(deptFormData),
      });

      if (response.ok) {
        setShowDeptModal(false);
        await fetchDepartments();
      }
    } catch (error) {
      console.error('Failed to save department:', error);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/departments/${id}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchDepartments();
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  const handleCreateEquip = () => {
    setEditingEquip(null);
    setEquipFormData({ 
      name: '', 
      type: 'equipment',
      category: equipmentSubTab === 'technologies' ? 'technology' : 'solution'
    });
    setShowEquipModal(true);
  };

  const handleEditEquip = (equip: Resource) => {
    setEditingEquip(equip);
    setEquipFormData({ 
      name: equip.name, 
      type: equip.type,
      category: equip.category || 'technology'
    });
    setShowEquipModal(true);
  };

  const handleEquipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionId = localStorage.getItem('sessionId');
      const url = editingEquip
        ? `${API_BASE_URL}/api/resources/${editingEquip.id}`
        : `${API_BASE_URL}/api/resources`;

      const response = await fetch(url, {
        method: editingEquip ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          ...equipFormData,
          category: equipFormData.type === 'equipment' ? equipFormData.category : undefined,
          allocatedTaskIds: editingEquip?.allocatedTaskIds || [],
        }),
      });

      if (response.ok) {
        setShowEquipModal(false);
        await fetchEquipment();
      }
    } catch (error) {
      console.error('Failed to save equipment:', error);
    }
  };

  const handleDeleteEquip = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/resources/${id}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        await fetchEquipment();
      }
    } catch (error) {
      console.error('Failed to delete equipment:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAllStrengths = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/clifton-strengths/all`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setAllStrengthsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch all strengths:', error);
    }
  };

  const loadUserStrengths = async (email: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const user = allUsers.find(u => u.email === email);
      if (!user) return;

      const response = await fetch(`${API_BASE_URL}/api/clifton-strengths/user/${user.id}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.topStrengths) {
          setUserStrengths([...data.topStrengths, '', '', '', '', '', ''].slice(0, 6));
        } else {
          setUserStrengths(['', '', '', '', '', '']);
        }
      } else {
        setUserStrengths(['', '', '', '', '', '']);
      }
    } catch (error) {
      console.error('Failed to load user strengths:', error);
      setUserStrengths(['', '', '', '', '', '']);
    }
  };

  const handleSaveStrengths = async () => {
    if (!selectedUserEmail || userStrengths.some(s => !s)) {
      alert('Please select a user and enter all 6 strengths.');
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/clifton-strengths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          userEmail: selectedUserEmail,
          topStrengths: userStrengths,
        }),
      });

      if (response.ok) {
        const savedData = await response.json();
        setSaveStatus({ type: 'success', message: 'Strengths saved successfully!' });
        await fetchAllStrengths();
        
        // Get userId from allUsers or savedData
        const targetUser = allUsers.find(u => u.email === selectedUserEmail);
        const targetUserId = savedData?.userId || targetUser?.id;
        
        // Trigger refresh in sidebar by dispatching custom event
        if (targetUserId) {
          console.log('[Settings] Triggering refresh for userId:', targetUserId);
          // Dispatch custom event to notify sidebar to refresh
          window.dispatchEvent(new CustomEvent('cliftonStrengthsUpdated', { 
            detail: { userId: targetUserId } 
          }));
          // Also use localStorage for cross-tab communication
          localStorage.setItem('cliftonStrengthsUpdated', targetUserId);
          setTimeout(() => localStorage.removeItem('cliftonStrengthsUpdated'), 100);
        }
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
      } else {
        const errorData = await response.json();
        setSaveStatus({ type: 'error', message: errorData.error || 'Failed to save strengths' });
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
      }
    } catch (error) {
      console.error('Failed to save strengths:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save strengths' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
    }
  };

  const handleDeleteStrengths = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user\'s strengths profile?')) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/clifton-strengths/user/${userId}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        setSaveStatus({ type: 'success', message: 'Strengths deleted successfully!' });
        await fetchAllStrengths();
        
        // Trigger refresh in sidebar by dispatching custom event
        window.dispatchEvent(new CustomEvent('cliftonStrengthsUpdated', { 
          detail: { userId } 
        }));
        // Also use localStorage for cross-tab communication
        localStorage.setItem('cliftonStrengthsUpdated', userId);
        setTimeout(() => localStorage.removeItem('cliftonStrengthsUpdated'), 100);
        
        if (selectedUserEmail) {
          const user = allUsers.find(u => u.id === userId);
          if (user && user.email === selectedUserEmail) {
            setSelectedUserEmail('');
            setUserStrengths(['', '', '', '', '', '']);
          }
        }
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
      } else {
        const errorData = await response.json();
        setSaveStatus({ type: 'error', message: errorData.error || 'Failed to delete strengths' });
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
      }
    } catch (error) {
      console.error('Failed to delete strengths:', error);
      setSaveStatus({ type: 'error', message: 'Failed to delete strengths' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
    }
  };

  const fetchConfigurations = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/configurations`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      if (response.ok) {
        const data = await response.json();
        // Normalize configurations - ensure allowedRoutes are arrays
        // Roles should already be normalized by migration to canonical form (PROJECT_MANAGER)
        const normalizedData = data.map((config: Configuration) => {
          // Ensure permissions are properly parsed with defaults
          let permissionsObj: Record<string, boolean> = {
            canDeleteProjects: false,
            canCreateProjects: false,
            canEditProjects: false,
            canEditTasks: false,
            canDeleteTasks: false,
          };
          
          if (config.permissions) {
            try {
              const parsed = typeof config.permissions === 'string' 
                ? JSON.parse(config.permissions) 
                : config.permissions;
              permissionsObj = { ...permissionsObj, ...parsed };
            } catch (e) {
              // Invalid JSON, use defaults
            }
          }
          
          return {
            ...config,
            allowedRoutes: Array.isArray(config.allowedRoutes) 
              ? config.allowedRoutes 
              : (typeof config.allowedRoutes === 'string' && config.allowedRoutes 
                  ? config.allowedRoutes.split(',').filter((r: string) => r.trim())
                  : []),
            permissions: JSON.stringify(permissionsObj), // Always store as string with all fields
          };
        });
        setConfigurations(normalizedData);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
    }
  };

  const handleSaveConfiguration = async (role: string, allowedRoutes: string[], permissions?: Record<string, boolean>) => {
    // Ensure role is in canonical form (should already be from enum, but normalize to be safe)
    const normalizedRole = role.toUpperCase();
    
    // Validate role
    if (!['ADMIN', 'PROJECT_MANAGER', 'USER', 'EXECUTIVES'].includes(normalizedRole)) {
      console.error('Invalid role:', role);
      setSaveStatus({ type: 'error', message: `Invalid role: ${role}` });
      setSavingConfig('');
      return;
    }
    
    console.log('handleSaveConfiguration called:', { role, normalizedRole, allowedRoutes, permissions, userRole: user?.role });
    
    // Ensure admin can always save
    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      console.warn('User is not admin, checking permissions...');
    }
    
    setSavingConfig(role);
    setSaveStatus({ type: null, message: '' });
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      const requestBody = { 
        role: normalizedRole, 
        allowedRoutes: allowedRoutes || [],
        permissions: permissions || {},
      };
      
      console.log('Sending request:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/api/configurations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status, response.statusText);

      if (response.ok) {
        const savedConfig = await response.json();
        console.log('Configuration saved successfully:', savedConfig);
        
        // Ensure savedConfig has the correct format
        // Handle allowedRoutes - it might be a string (from simple-array) or array
        let normalizedAllowedRoutes: string[] = [];
        if (Array.isArray(savedConfig.allowedRoutes)) {
          normalizedAllowedRoutes = savedConfig.allowedRoutes;
        } else if (typeof savedConfig.allowedRoutes === 'string' && savedConfig.allowedRoutes) {
          // Parse simple-array format (comma-separated)
          normalizedAllowedRoutes = savedConfig.allowedRoutes.split(',').filter(r => r.trim());
        }
        
        const normalizedConfig = {
          ...savedConfig,
          allowedRoutes: normalizedAllowedRoutes,
          permissions: savedConfig.permissions || '{}',
        };
        
        console.log('Normalized config after save:', normalizedConfig);
        
        // Update local state with the saved configuration from server
        setConfigurations((prevConfigs) => {
          const existingIndex = prevConfigs.findIndex((c) => {
            const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
            return configRole === normalizedRole;
          });
          
          if (existingIndex >= 0) {
            // Update existing configuration with server response
            const updated = [...prevConfigs];
            updated[existingIndex] = {
              ...updated[existingIndex],
              allowedRoutes: normalizedAllowedRoutes,
              permissions: normalizedConfig.permissions,
            };
            console.log('Updated configuration in state:', updated[existingIndex]);
            return updated;
          } else {
            // Add new configuration
            return [...prevConfigs, normalizedConfig];
          }
        });
        
        setSaveStatus({ type: 'success', message: `Configuration saved successfully for ${role}` });
        // Don't fetch again - we already have the saved config from the response
        // This prevents overwriting with potentially stale data
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save configuration' }));
        console.error('Failed to save configuration - response:', errorData);
        setSaveStatus({ type: 'error', message: errorData.error || 'Failed to save configuration' });
        // Clear error message after 5 seconds
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      console.error('Failed to save configuration - exception:', error);
      setSaveStatus({ type: 'error', message: errorMessage });
      // Clear error message after 5 seconds
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
    } finally {
      setSavingConfig(null);
    }
  };

  // Permission checking is handled by ProtectedRoute component
  // If this component renders, the user has permission to access settings

  if (loading) {
    return <div className="settings-loading">Loading...</div>;
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          Departments
        </button>
        <button
          className={`settings-tab ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment
        </button>
        <button
          className={`settings-tab ${activeTab === 'configurations' ? 'active' : ''}`}
          onClick={() => setActiveTab('configurations')}
        >
          Configurations
        </button>
        {user && (user.role === 'ADMIN' || user.role === 'admin') && (
          <button
            className={`settings-tab ${activeTab === 'cliftonStrengths' ? 'active' : ''}`}
            onClick={() => setActiveTab('cliftonStrengths')}
          >
            CliftonStrengths
          </button>
        )}
      </div>

      <div className="settings-content">
        {activeTab === 'departments' && (
          <div className="departments-tab">
            <div className="tab-header">
              <h2>Departments</h2>
              <button onClick={handleCreateDept} className="btn-primary">
                + Add Department
              </button>
            </div>

            <div className="departments-list">
              {departments.map((dept) => (
                <div key={dept.id} className="department-card">
                  <div className="department-info">
                    <h3>{dept.name}</h3>
                    {dept.description && <p>{dept.description}</p>}
                  </div>
                  <div className="department-actions">
                    <button onClick={() => handleEditDept(dept)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteDept(dept.id)} className="btn-delete">
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {departments.length === 0 && (
                <div className="empty-state">
                  <p>No departments yet. Create your first department.</p>
                  <button onClick={handleCreateDept} className="btn-primary">
                    Add First Department
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="equipment-tab">
            <div className="equipment-sub-tabs">
              <button
                className={`equipment-sub-tab ${equipmentSubTab === 'technologies' ? 'active' : ''}`}
                onClick={() => setEquipmentSubTab('technologies')}
              >
                Track & Trace Technologies
              </button>
              <button
                className={`equipment-sub-tab ${equipmentSubTab === 'solutions' ? 'active' : ''}`}
                onClick={() => setEquipmentSubTab('solutions')}
              >
                Track & Trace Solutions
              </button>
            </div>

            <div className="tab-header">
              <h2>
                {equipmentSubTab === 'technologies' 
                  ? 'Track & Trace Technologies' 
                  : 'Track & Trace Solutions'}
              </h2>
              <button onClick={handleCreateEquip} className="btn-primary">
                + Add {equipmentSubTab === 'technologies' ? 'Technology' : 'Solution'}
              </button>
            </div>

            <div className="equipment-list">
              {equipment
                .filter((equip) => 
                  equipmentSubTab === 'technologies' 
                    ? equip.category === 'technology'
                    : equip.category === 'solution'
                )
                .map((equip) => (
                  <div key={equip.id} className="equipment-card">
                    <div className="equipment-info">
                      <h3>{equip.name}</h3>
                      <span className="equipment-type">{equip.category || 'equipment'}</span>
                    </div>
                    <div className="equipment-actions">
                      <button onClick={() => handleEditEquip(equip)} className="btn-edit">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteEquip(equip.id)} className="btn-delete">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

              {equipment.filter((equip) => 
                equipmentSubTab === 'technologies' 
                  ? equip.category === 'technology'
                  : equip.category === 'solution'
              ).length === 0 && (
                <div className="empty-state">
                  <p>
                    No {equipmentSubTab === 'technologies' ? 'technologies' : 'solutions'} yet.
                    {equipmentSubTab === 'technologies' 
                      ? ' Technologies will be pre-populated on first load.'
                      : ' Solutions will be pre-populated on first load.'}
                  </p>
                  <button onClick={handleCreateEquip} className="btn-primary">
                    Add First {equipmentSubTab === 'technologies' ? 'Technology' : 'Solution'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'configurations' && (
          <div className="configurations-tab">
            <div className="tab-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ flex: 1 }}>
                  <h2>Role Permissions Configuration</h2>
                  <p className="tab-description">
                    Configure which pages each role can access. Select the routes that each role should have permission to view.
                    <strong style={{ display: 'block', marginTop: '8px', color: '#e74c3c' }}>
                      ⚠️ Important: Routes that are NOT ticked will be BLOCKED for that role. Users will not be able to access unticked routes.
                    </strong>
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to reset all access for PROJECT_MANAGER, USER, and EXECUTIVES roles? This will remove all granted permissions. Admin access will remain unchanged.')) {
                      return;
                    }
                    
                    try {
                      const sessionId = localStorage.getItem('sessionId');
                      const rolesToReset = ['PROJECT_MANAGER', 'USER', 'EXECUTIVES'];
                      
                      // Reset each non-admin role
                      for (const role of rolesToReset) {
                        const response = await fetch(`${API_BASE_URL}/api/configurations`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-session-id': sessionId || '',
                          },
                          body: JSON.stringify({
                            role,
                            allowedRoutes: [],
                            permissions: { canDeleteProjects: false, canCreateProjects: false, canEditProjects: false, canEditTasks: false, canDeleteTasks: false },
                          }),
                        });
                        
                        if (!response.ok) {
                          throw new Error(`Failed to reset ${role}`);
                        }
                      }
                      
                      setSaveStatus({ type: 'success', message: 'All access has been reset for non-admin roles' });
                      await fetchConfigurations();
                      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
                    } catch (error) {
                      console.error('Failed to reset configurations:', error);
                      setSaveStatus({ type: 'error', message: 'Failed to reset access. Please try again.' });
                      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
                    }
                  }}
                  className="btn-reset"
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                    transition: 'all var(--transition-base)',
                    marginLeft: 'var(--spacing-lg)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Reset All Access
                </button>
              </div>
              {saveStatus.type && (
                <div className={`save-status ${saveStatus.type}`}>
                  {saveStatus.type === 'success' ? '✓' : '✗'} {saveStatus.message}
                </div>
              )}
            </div>

            <div className="configurations-list">
              {['ADMIN', 'PROJECT_MANAGER', 'USER', 'EXECUTIVES'].map((role) => {
                // Find configuration - roles should already be normalized to canonical form
                const config = configurations.find((c) => {
                  const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                  return configRole === role;
                });
                const allowedRoutes = config?.allowedRoutes || [];
                const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'PROJECT_MANAGER' ? 'Project Manager' : role === 'EXECUTIVES' ? 'Executives' : 'User';
                
                // Parse permissions with defaults
                const defaultPermissions = {
                  canDeleteProjects: false,
                  canCreateProjects: false,
                  canEditProjects: false,
                  canEditTasks: false,
                  canDeleteTasks: false,
                };
                
                let permissions: Record<string, boolean> = { ...defaultPermissions };
                if (config?.permissions) {
                  try {
                    const parsed = typeof config.permissions === 'string' 
                      ? JSON.parse(config.permissions) 
                      : config.permissions;
                    permissions = { ...defaultPermissions, ...parsed };
                  } catch (e) {
                    // Invalid JSON, use defaults
                  }
                }
                const canDeleteProjects = permissions.canDeleteProjects === true;

                return (
                  <div key={role} className="configuration-card">
                    <div className="configuration-header">
                      <h3>{roleLabel}</h3>
                      <span className="role-badge">{role}</span>
                    </div>
                    <div className="configuration-content">
                      <div className="routes-selection">
                        <h4 className="section-title">Page Access</h4>
                        {AVAILABLE_ROUTES.map((route) => {
                          // Get the current config from state (which updates optimistically)
                          const currentConfig = configurations.find((c) => {
                            const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                            return configRole === role;
                          });
                          // Ensure allowedRoutes is always an array
                          let currentAllowedRoutes: string[] = [];
                          if (currentConfig?.allowedRoutes) {
                            currentAllowedRoutes = Array.isArray(currentConfig.allowedRoutes)
                              ? currentConfig.allowedRoutes
                              : (typeof currentConfig.allowedRoutes === 'string' && currentConfig.allowedRoutes
                                  ? currentConfig.allowedRoutes.split(',').filter(r => r.trim())
                                  : []);
                          } else if (allowedRoutes && allowedRoutes.length > 0) {
                            currentAllowedRoutes = Array.isArray(allowedRoutes) ? allowedRoutes : [];
                          }
                          const isChecked = currentAllowedRoutes.includes(route.value);
                          const isSaving = savingConfig === role;
                          return (
                            <label 
                              key={route.value} 
                              className={`route-checkbox ${isSaving ? 'saving' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSaving}
                                onChange={async (e) => {
                                  const newChecked = e.target.checked;
                                  console.log('Checkbox changed:', route.value, newChecked, 'for role:', role);
                                  if (isSaving) {
                                    console.log('Currently saving, ignoring change');
                                    return;
                                  }
                                  
                                  // Calculate new allowed routes
                                  const newAllowedRoutes = newChecked
                                    ? [...currentAllowedRoutes, route.value]
                                    : currentAllowedRoutes.filter((r) => r !== route.value);
                                  
                                  // Update local state IMMEDIATELY for instant visual feedback
                                  setConfigurations((prevConfigs) => {
                                    const configIndex = prevConfigs.findIndex((c) => {
                                      const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                                      return configRole === role;
                                    });
                                    
                                    if (configIndex >= 0) {
                                      const updated = [...prevConfigs];
                                      updated[configIndex] = {
                                        ...updated[configIndex],
                                        allowedRoutes: newAllowedRoutes,
                                      };
                                      return updated;
                                    } else {
                                      // Create new config if it doesn't exist
                                      return [...prevConfigs, {
                                        id: '',
                                        role: role as any,
                                        allowedRoutes: newAllowedRoutes,
                                        permissions: JSON.stringify(permissions || {}),
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                      }];
                                    }
                                  });
                                  
                                  console.log('Saving configuration for role:', role, 'with routes:', newAllowedRoutes);
                                  await handleSaveConfiguration(role, newAllowedRoutes, permissions);
                                }}
                              />
                              <span>{route.label}</span>
                              {isSaving && <span className="saving-indicator">Saving...</span>}
                            </label>
                          );
                        })}
                      </div>
                      
                      <div className="permissions-selection">
                        <h4 className="section-title">Project Permissions</h4>
                        {(() => {
                          // Get current config from state (which updates optimistically)
                          const currentConfig = configurations.find((c) => {
                            const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                            return configRole === role;
                          });
                          // Always initialize with defaults
                          const defaultPermissions = {
                            canDeleteProjects: false,
                            canCreateProjects: false,
                            canEditProjects: false,
                            canEditTasks: false,
                            canDeleteTasks: false,
                          };
                          
                          let currentPermissions: Record<string, boolean> = { ...defaultPermissions };
                          if (currentConfig?.permissions) {
                            try {
                              const parsed = typeof currentConfig.permissions === 'string' 
                                ? JSON.parse(currentConfig.permissions) 
                                : currentConfig.permissions;
                              currentPermissions = { ...defaultPermissions, ...parsed };
                            } catch (e) {
                              // Invalid JSON, use defaults
                            }
                          }
                          const currentCanDeleteProjects = role === 'ADMIN' ? true : currentPermissions.canDeleteProjects === true;
                          const isSaving = savingConfig === role;
                          
                          return (
                            <label className={`route-checkbox ${role === 'ADMIN' ? 'disabled' : ''} ${isSaving ? 'saving' : ''}`}>
                              <input
                                type="checkbox"
                                checked={currentCanDeleteProjects}
                                disabled={role === 'ADMIN' || isSaving}
                                onChange={async (e) => {
                                  const newChecked = e.target.checked;
                                  console.log('Can Delete Projects changed:', newChecked, 'for role:', role);
                                  if (isSaving) {
                                    console.log('Currently saving, ignoring change');
                                    return;
                                  }
                                  
                                  const newPermissions = {
                                    ...currentPermissions,
                                    canDeleteProjects: newChecked,
                                  };
                                  
                                  // Update local state IMMEDIATELY for instant visual feedback
                                  setConfigurations((prevConfigs) => {
                                    const configIndex = prevConfigs.findIndex((c) => {
                                      const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                                      return configRole === role;
                                    });
                                    
                                    if (configIndex >= 0) {
                                      const updated = [...prevConfigs];
                                      updated[configIndex] = {
                                        ...updated[configIndex],
                                        permissions: JSON.stringify(newPermissions),
                                      };
                                      return updated;
                                    } else {
                                      // Create new config if it doesn't exist
                                      const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                      return [...prevConfigs, {
                                        id: '',
                                        role: role as any,
                                        allowedRoutes: currentAllowedRoutes,
                                        permissions: JSON.stringify(newPermissions),
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                      }];
                                    }
                                  });
                                  
                                  const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                  console.log('Saving permissions for role:', role, 'with permissions:', newPermissions);
                                  await handleSaveConfiguration(role, currentAllowedRoutes, newPermissions);
                                }}
                              />
                              <span>
                                Can Delete Projects
                                {role === 'ADMIN' && <span className="permission-note"> (Always enabled for Admin)</span>}
                                {isSaving && <span className="saving-indicator">Saving...</span>}
                              </span>
                            </label>
                          );
                        })()}
                        
                        {(() => {
                          // Get current config from state (which updates optimistically)
                          const currentConfig = configurations.find((c) => {
                            const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                            return configRole === role;
                          });
                          // Always initialize with defaults
                          const defaultPermissions = {
                            canDeleteProjects: false,
                            canCreateProjects: false,
                            canEditProjects: false,
                            canEditTasks: false,
                            canDeleteTasks: false,
                          };
                          
                          let currentPermissions: Record<string, boolean> = { ...defaultPermissions };
                          if (currentConfig?.permissions) {
                            try {
                              const parsed = typeof currentConfig.permissions === 'string' 
                                ? JSON.parse(currentConfig.permissions) 
                                : currentConfig.permissions;
                              currentPermissions = { ...defaultPermissions, ...parsed };
                            } catch (e) {
                              // Invalid JSON, use defaults
                            }
                          }
                          const currentCanCreateProjects = role === 'ADMIN' ? true : currentPermissions.canCreateProjects === true;
                          const isSaving = savingConfig === role;
                          
                          return (
                            <label className={`route-checkbox ${role === 'ADMIN' ? 'disabled' : ''} ${isSaving ? 'saving' : ''}`}>
                              <input
                                type="checkbox"
                                checked={currentCanCreateProjects}
                                disabled={role === 'ADMIN' || isSaving}
                                onChange={async (e) => {
                                  const newChecked = e.target.checked;
                                  console.log('Can Create Projects changed:', newChecked, 'for role:', role);
                                  if (isSaving) {
                                    console.log('Currently saving, ignoring change');
                                    return;
                                  }
                                  
                                  const newPermissions = {
                                    ...currentPermissions,
                                    canCreateProjects: newChecked,
                                  };
                                  
                                  // Update local state IMMEDIATELY for instant visual feedback
                                  setConfigurations((prevConfigs) => {
                                    const configIndex = prevConfigs.findIndex((c) => {
                                      const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                                      return configRole === role;
                                    });
                                    
                                    if (configIndex >= 0) {
                                      const updated = [...prevConfigs];
                                      updated[configIndex] = {
                                        ...updated[configIndex],
                                        permissions: JSON.stringify(newPermissions),
                                      };
                                      return updated;
                                    } else {
                                      // Create new config if it doesn't exist
                                      const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                      return [...prevConfigs, {
                                        id: '',
                                        role: role as any,
                                        allowedRoutes: currentAllowedRoutes,
                                        permissions: JSON.stringify(newPermissions),
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                      }];
                                    }
                                  });
                                  
                                  const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                  console.log('Saving permissions for role:', role, 'with permissions:', newPermissions);
                                  await handleSaveConfiguration(role, currentAllowedRoutes, newPermissions);
                                }}
                              />
                              <span>
                                Create Project
                                {role === 'ADMIN' && <span className="permission-note"> (Always enabled for Admin)</span>}
                                {isSaving && <span className="saving-indicator">Saving...</span>}
                              </span>
                            </label>
                          );
                        })()}
                        
                        {(() => {
                          const currentConfig = configurations.find((c) => {
                            const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                            return configRole === role;
                          });
                          // Always initialize with defaults
                          const defaultPermissions = {
                            canDeleteProjects: false,
                            canCreateProjects: false,
                            canEditProjects: false,
                            canEditTasks: false,
                            canDeleteTasks: false,
                          };
                          
                          let currentPermissions: Record<string, boolean> = { ...defaultPermissions };
                          if (currentConfig?.permissions) {
                            try {
                              const parsed = typeof currentConfig.permissions === 'string' 
                                ? JSON.parse(currentConfig.permissions) 
                                : currentConfig.permissions;
                              currentPermissions = { ...defaultPermissions, ...parsed };
                            } catch (e) {
                              // Invalid JSON, use defaults
                            }
                          }
                          const currentCanEditProjects = role === 'ADMIN' ? true : currentPermissions.canEditProjects === true;
                          const isSaving = savingConfig === role;
                          
                          return (
                            <label className={`route-checkbox ${role === 'ADMIN' ? 'disabled' : ''} ${isSaving ? 'saving' : ''}`}>
                              <input
                                type="checkbox"
                                checked={currentCanEditProjects}
                                disabled={role === 'ADMIN' || isSaving}
                                onChange={async (e) => {
                                  const newChecked = e.target.checked;
                                  if (isSaving) return;
                                  
                                  const newPermissions = {
                                    ...currentPermissions,
                                    canEditProjects: newChecked,
                                  };
                                  
                                  setConfigurations((prevConfigs) => {
                                    const configIndex = prevConfigs.findIndex((c) => {
                                      const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                                      return configRole === role;
                                    });
                                    
                                    if (configIndex >= 0) {
                                      const updated = [...prevConfigs];
                                      updated[configIndex] = {
                                        ...updated[configIndex],
                                        permissions: JSON.stringify(newPermissions),
                                      };
                                      return updated;
                                    } else {
                                      const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                      return [...prevConfigs, {
                                        id: '',
                                        role: role as any,
                                        allowedRoutes: currentAllowedRoutes,
                                        permissions: JSON.stringify(newPermissions),
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                      }];
                                    }
                                  });
                                  
                                  const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                  await handleSaveConfiguration(role, currentAllowedRoutes, newPermissions);
                                }}
                              />
                              <span>
                                Edit Project
                                {role === 'ADMIN' && <span className="permission-note"> (Always enabled for Admin)</span>}
                                {isSaving && <span className="saving-indicator">Saving...</span>}
                              </span>
                            </label>
                          );
                        })()}
                        
                        {(() => {
                          const currentConfig = configurations.find((c) => {
                            const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                            return configRole === role;
                          });
                          // Always initialize with defaults
                          const defaultPermissions = {
                            canDeleteProjects: false,
                            canCreateProjects: false,
                            canEditProjects: false,
                            canEditTasks: false,
                            canDeleteTasks: false,
                          };
                          
                          let currentPermissions: Record<string, boolean> = { ...defaultPermissions };
                          if (currentConfig?.permissions) {
                            try {
                              const parsed = typeof currentConfig.permissions === 'string' 
                                ? JSON.parse(currentConfig.permissions) 
                                : currentConfig.permissions;
                              currentPermissions = { ...defaultPermissions, ...parsed };
                            } catch (e) {
                              // Invalid JSON, use defaults
                            }
                          }
                          const currentCanEditTasks = role === 'ADMIN' ? true : currentPermissions.canEditTasks === true;
                          const isSaving = savingConfig === role;
                          
                          return (
                            <label className={`route-checkbox ${role === 'ADMIN' ? 'disabled' : ''} ${isSaving ? 'saving' : ''}`}>
                              <input
                                type="checkbox"
                                checked={currentCanEditTasks}
                                disabled={role === 'ADMIN' || isSaving}
                                onChange={async (e) => {
                                  const newChecked = e.target.checked;
                                  if (isSaving) return;
                                  
                                  const newPermissions = {
                                    ...currentPermissions,
                                    canEditTasks: newChecked,
                                  };
                                  
                                  setConfigurations((prevConfigs) => {
                                    const configIndex = prevConfigs.findIndex((c) => {
                                      const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                                      return configRole === role;
                                    });
                                    
                                    if (configIndex >= 0) {
                                      const updated = [...prevConfigs];
                                      updated[configIndex] = {
                                        ...updated[configIndex],
                                        permissions: JSON.stringify(newPermissions),
                                      };
                                      return updated;
                                    } else {
                                      const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                      return [...prevConfigs, {
                                        id: '',
                                        role: role as any,
                                        allowedRoutes: currentAllowedRoutes,
                                        permissions: JSON.stringify(newPermissions),
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                      }];
                                    }
                                  });
                                  
                                  const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                  await handleSaveConfiguration(role, currentAllowedRoutes, newPermissions);
                                }}
                              />
                              <span>
                                Edit Task
                                {role === 'ADMIN' && <span className="permission-note"> (Always enabled for Admin)</span>}
                                {isSaving && <span className="saving-indicator">Saving...</span>}
                              </span>
                            </label>
                          );
                        })()}
                        
                        {(() => {
                          const currentConfig = configurations.find((c) => {
                            const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                            return configRole === role;
                          });
                          // Always initialize with defaults
                          const defaultPermissions = {
                            canDeleteProjects: false,
                            canCreateProjects: false,
                            canEditProjects: false,
                            canEditTasks: false,
                            canDeleteTasks: false,
                          };
                          
                          let currentPermissions: Record<string, boolean> = { ...defaultPermissions };
                          if (currentConfig?.permissions) {
                            try {
                              const parsed = typeof currentConfig.permissions === 'string' 
                                ? JSON.parse(currentConfig.permissions) 
                                : currentConfig.permissions;
                              currentPermissions = { ...defaultPermissions, ...parsed };
                            } catch (e) {
                              // Invalid JSON, use defaults
                            }
                          }
                          const currentCanDeleteTasks = role === 'ADMIN' ? true : currentPermissions.canDeleteTasks === true;
                          const isSaving = savingConfig === role;
                          
                          return (
                            <label className={`route-checkbox ${role === 'ADMIN' ? 'disabled' : ''} ${isSaving ? 'saving' : ''}`}>
                              <input
                                type="checkbox"
                                checked={currentCanDeleteTasks}
                                disabled={role === 'ADMIN' || isSaving}
                                onChange={async (e) => {
                                  const newChecked = e.target.checked;
                                  if (isSaving) return;
                                  
                                  const newPermissions = {
                                    ...currentPermissions,
                                    canDeleteTasks: newChecked,
                                  };
                                  
                                  setConfigurations((prevConfigs) => {
                                    const configIndex = prevConfigs.findIndex((c) => {
                                      const configRole = typeof c.role === 'string' ? c.role.toUpperCase() : c.role;
                                      return configRole === role;
                                    });
                                    
                                    if (configIndex >= 0) {
                                      const updated = [...prevConfigs];
                                      updated[configIndex] = {
                                        ...updated[configIndex],
                                        permissions: JSON.stringify(newPermissions),
                                      };
                                      return updated;
                                    } else {
                                      const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                      return [...prevConfigs, {
                                        id: '',
                                        role: role as any,
                                        allowedRoutes: currentAllowedRoutes,
                                        permissions: JSON.stringify(newPermissions),
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                      }];
                                    }
                                  });
                                  
                                  const currentAllowedRoutes = currentConfig?.allowedRoutes || allowedRoutes;
                                  await handleSaveConfiguration(role, currentAllowedRoutes, newPermissions);
                                }}
                              />
                              <span>
                                Delete Task
                                {role === 'ADMIN' && <span className="permission-note"> (Always enabled for Admin)</span>}
                                {isSaving && <span className="saving-indicator">Saving...</span>}
                              </span>
                            </label>
                          );
                        })()}
                      </div>
                      
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'cliftonStrengths' && user && (user.role === 'ADMIN' || user.role === 'admin') && (
          <div className="clifton-strengths-tab">
            <div className="tab-header">
              <h2>CliftonStrengths Management</h2>
              <p className="tab-description">
                Manage CliftonStrengths profiles for users. Select a user by email and enter their Top 6 strengths.
              </p>
            </div>

            <div className="strengths-form-section">
              <div className="form-group">
                <label>Select User by Email *</label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => {
                    setSelectedUserEmail(e.target.value);
                    if (e.target.value) {
                      loadUserStrengths(e.target.value);
                    } else {
                      setUserStrengths(['', '', '', '', '', '']);
                    }
                  }}
                  className="input"
                >
                  <option value="">-- Select a user --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.email} {u.name && u.surname ? `(${u.name} ${u.surname})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUserEmail && (
                <div className="strengths-input-section">
                  <h3>Top 6 CliftonStrengths</h3>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div key={index} className="form-group">
                      <label>Strength #{index + 1} *</label>
                      <select
                        value={userStrengths[index] || ''}
                        onChange={(e) => {
                          const newStrengths = [...userStrengths];
                          newStrengths[index] = e.target.value;
                          setUserStrengths(newStrengths);
                        }}
                        className="input"
                        required
                      >
                        <option value="">-- Select strength --</option>
                        {ALL_CLIFTON_STRENGTHS.filter(
                          (strength) => !userStrengths.includes(strength) || userStrengths[index] === strength
                        ).map((strength) => (
                          <option key={strength} value={strength}>
                            {strength}
                            {STRENGTH_DETAILS[strength] && ` (${STRENGTH_DETAILS[strength].category})`}
                          </option>
                        ))}
                      </select>
                      {userStrengths[index] && STRENGTH_DETAILS[userStrengths[index]] && (
                        <div className="strength-preview">
                          <div className="preview-category">
                            {STRENGTH_DETAILS[userStrengths[index]].category}
                          </div>
                          <div className="preview-description">
                            {STRENGTH_DETAILS[userStrengths[index]].description}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={handleSaveStrengths}
                      className="btn-primary"
                      disabled={!selectedUserEmail || userStrengths.some(s => !s)}
                    >
                      {allStrengthsData.find(s => s.userEmail === selectedUserEmail) ? 'Update' : 'Save'} Strengths
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserEmail('');
                        setUserStrengths(['', '', '', '', '', '']);
                      }}
                      className="btn-secondary"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="strengths-list-section">
                <h3>All User Strengths</h3>
                {allStrengthsData.length === 0 ? (
                  <div className="empty-state">
                    <p>No strengths profiles created yet.</p>
                  </div>
                ) : (
                  <div className="strengths-table">
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Top 6 Strengths</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStrengthsData.map((strengthData) => (
                          <tr key={strengthData.id}>
                            <td>{strengthData.userName}</td>
                            <td>{strengthData.userEmail}</td>
                            <td>
                              <div className="strengths-tags">
                                {strengthData.topStrengths.map((s: string, idx: number) => (
                                  <span key={idx} className="strength-tag">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>{new Date(strengthData.updatedAt).toLocaleDateString()}</td>
                            <td>
                              <button
                                onClick={() => {
                                  setSelectedUserEmail(strengthData.userEmail);
                                  setUserStrengths([...strengthData.topStrengths]);
                                }}
                                className="btn-edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStrengths(strengthData.userId)}
                                className="btn-delete"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingDept ? 'Edit Department' : 'Add Department'}</h2>
            <form onSubmit={handleDeptSubmit}>
              <div className="form-group">
                <label>Department Name *</label>
                <input
                  type="text"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  required
                  placeholder="e.g., Engineering, Production, Quality Control"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the department..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowDeptModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingDept ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Equipment Modal */}
      {showEquipModal && (
        <div className="modal-overlay" onClick={() => setShowEquipModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingEquip ? 'Edit Equipment' : 'Add Equipment'}</h2>
            <form onSubmit={handleEquipSubmit}>
              <div className="form-group">
                <label>
                  {equipFormData.category === 'technology' 
                    ? 'Technology Name *' 
                    : equipFormData.category === 'solution'
                    ? 'Solution Name *'
                    : 'Equipment / Material Name *'}
                </label>
                <input
                  type="text"
                  value={equipFormData.name}
                  onChange={(e) => setEquipFormData({ ...equipFormData, name: e.target.value })}
                  required
                  placeholder={
                    equipFormData.category === 'technology'
                      ? 'e.g., Laser Marking, Dot Peen Marking'
                      : equipFormData.category === 'solution'
                      ? 'e.g., Production Monitoring System, Vision Inspection'
                      : 'e.g., Laser Marker, Raw Materials, Components'
                  }
                />
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={equipFormData.type}
                  onChange={(e) => setEquipFormData({ ...equipFormData, type: e.target.value as 'labour' | 'equipment' })}
                  required
                >
                  <option value="equipment">Equipment</option>
                  <option value="labour">Labour</option>
                </select>
              </div>
              {equipFormData.type === 'equipment' && (
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={equipFormData.category || 'technology'}
                    onChange={(e) => setEquipFormData({ ...equipFormData, category: e.target.value as 'technology' | 'solution' })}
                    required
                  >
                    <option value="technology">Track & Trace Technology</option>
                    <option value="solution">Track & Trace Solution</option>
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEquipModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingEquip ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

