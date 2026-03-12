import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../../shared/types';
import './Users.css';

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  role: string;
  departmentId?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    role: UserRole.USER,
    departmentId: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

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

  const fetchUsers = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUsers();
        setShowCreateForm(false);
        setFormData({
          name: '',
          surname: '',
          email: '',
          password: '',
          role: UserRole.USER,
          departmentId: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      // Only include password if it's provided (not empty)
      const updateData: any = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        role: formData.role,
        departmentId: formData.departmentId || null,
      };
      
      // Only add password if it's not empty
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchUsers();
        setEditingUser(null);
        setFormData({
          name: '',
          surname: '',
          email: '',
          password: '',
          role: UserRole.USER,
          departmentId: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok || response.status === 204) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const canManageUsers = currentUser?.role === 'ADMIN' || currentUser?.role === 'admin';

  // Group users by department
  const usersByDepartment = users.reduce((acc, user) => {
    const deptId = user.departmentId || 'no-department';
    const deptName = user.departmentId 
      ? departments.find(d => d.id === user.departmentId)?.name || 'Unknown Department'
      : 'No Department';
    
    if (!acc[deptId]) {
      acc[deptId] = {
        id: deptId,
        name: deptName,
        users: [],
      };
    }
    acc[deptId].users.push(user);
    return acc;
  }, {} as Record<string, { id: string; name: string; users: User[] }>);

  // Sort departments alphabetically, with "No Department" last
  const sortedDepartments = Object.values(usersByDepartment).sort((a, b) => {
    if (a.id === 'no-department') return 1;
    if (b.id === 'no-department') return -1;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return <div className="users-loading">Loading...</div>;
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>Users</h1>
        {canManageUsers && (
          <button onClick={() => {
            setEditingUser(null);
            setFormData({
              name: '',
              surname: '',
              email: '',
              password: '',
              role: UserRole.USER,
              departmentId: '',
            });
            setShowCreateForm(true);
          }} className="btn-primary">
            Create User
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateForm(false);
          setEditingUser(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
            <form onSubmit={editingUser ? handleUpdate : handleCreate}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Surname</label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password {editingUser && <span style={{ fontSize: '0.85em', color: '#888', fontWeight: 'normal' }}>(leave blank to keep current password)</span>}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  placeholder={editingUser ? "Enter new password (optional)" : "Enter password"}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  required
                >
                  <option value={UserRole.USER}>User</option>
                  <option value={UserRole.PROJECT_MANAGER}>Project Manager</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.EXECUTIVES}>Executives</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowCreateForm(false);
                  setEditingUser(null);
                }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table-container">
        {sortedDepartments.map((dept) => (
          <div key={dept.id} className="department-group">
            <div className="department-header">
              <h2 className="department-name">{dept.name}</h2>
              <span className="department-count">{dept.users.length} {dept.users.length === 1 ? 'user' : 'users'}</span>
            </div>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {canManageUsers && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {dept.users.map((user) => (
                  <tr key={user.id}>
                    <td className="user-name-cell">
                      <span className="user-name">{user.name} {user.surname}</span>
                    </td>
                    <td className="user-email-cell">{user.email}</td>
                    <td className="user-role-cell">
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    {canManageUsers && (
                      <td className="user-actions-cell">
                        <button 
                          onClick={() => {
                            setEditingUser(user);
                            setFormData({
                              name: user.name,
                              surname: user.surname,
                              email: user.email,
                              password: '',
                              role: user.role as UserRole,
                              departmentId: user.departmentId || '',
                            });
                            setShowCreateForm(true);
                          }} 
                          className="btn-edit"
                          title="Edit User"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)} 
                          className="btn-delete"
                          title="Delete User"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Users;
