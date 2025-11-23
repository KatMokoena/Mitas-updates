import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { ProjectStatus, ComponentType } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import './Projects.css';

interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  components: ComponentType[];
  startDate?: string;
  endDate?: string;
}

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: ProjectStatus.PLANNING,
    components: [] as ComponentType[],
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const canManageProjects = user?.role === 'ADMIN' || user?.role === 'admin' || user?.role === 'PROJECT_MANAGER' || user?.role === 'project_manager';

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      description: '',
      status: ProjectStatus.PLANNING,
      components: [],
    });
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      status: project.status,
      components: project.components,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sessionId = localStorage.getItem('sessionId');
      const url = editingProject
        ? `${API_BASE_URL}/api/projects/${editingProject.id}`
        : `${API_BASE_URL}/api/projects`;

      const response = await fetch(url, {
        method: editingProject ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const toggleComponent = (component: ComponentType) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.includes(component)
        ? prev.components.filter((c) => c !== component)
        : [...prev.components, component],
    }));
  };

  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return '#3498db';
      case ProjectStatus.COMPLETED:
        return '#27ae60';
      case ProjectStatus.ON_HOLD:
        return '#f39c12';
      case ProjectStatus.CANCELLED:
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const componentLabels: Record<ComponentType, string> = {
    [ComponentType.LASER_MARKER]: 'Laser Marker',
    [ComponentType.SCRIBE_MARKER]: 'Scribe Marker',
    [ComponentType.INKJET_MACHINE]: 'Inkjet Machine',
    [ComponentType.AUTOMATION]: 'Automation',
    [ComponentType.CUSTOM_SOFTWARE]: 'Custom Software',
    [ComponentType.VISION_SYSTEM]: 'Vision System',
    [ComponentType.QUALITY_CONTROL]: 'Quality Control',
    [ComponentType.MATERIALS_HANDLING]: 'Materials Handling',
  };

  if (loading) {
    return <div className="projects-loading">Loading...</div>;
  }

  return (
    <div className="projects">
      <div className="projects-header">
        <h1>Projects</h1>
        {canManageProjects && (
          <button onClick={handleCreate} className="btn-primary">
            + New Project
          </button>
        )}
      </div>

      <div className="projects-list">
        {projects.map((project) => (
          <div key={project.id} className="project-item">
            <Link to={`/projects/${project.id}`} className="project-link">
              <div className="project-info">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="project-meta">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(project.status) }}
                  >
                    {project.status.replace('_', ' ')}
                  </span>
                  {project.components.length > 0 && (
                    <span className="components-count">
                      {project.components.length} component{project.components.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            {canManageProjects && (
              <div className="project-actions">
                <button onClick={() => handleEdit(project)} className="btn-edit">
                  Edit
                </button>
                <button onClick={() => handleDelete(project.id)} className="btn-delete">
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProject ? 'Edit Project' : 'Create Project'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                >
                  {Object.values(ProjectStatus).map((status: ProjectStatus) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Components</label>
                <div className="components-grid">
                  {Object.values(ComponentType).map((component: ComponentType) => (
                    <label key={component} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.components.includes(component)}
                        onChange={() => toggleComponent(component)}
                      />
                      {componentLabels[component]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;



