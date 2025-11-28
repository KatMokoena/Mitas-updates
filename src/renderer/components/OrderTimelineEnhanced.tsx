import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { TaskStatus, OrderStatus, OrderPriority } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
// PDF generation now handled server-side via API
import RequisitionForm from './RequisitionForm';
import './OrderTimelineEnhanced.css';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  description?: string;
  deadline: string;
  status: OrderStatus;
  priority: OrderPriority;
  equipmentIds?: string[] | string;
  createdBy?: string;
  departmentId?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  isCritical?: boolean;
  slackDays?: number;
  dependencies: string[];
  assignedUserId?: string;
  resourceIds?: string[];
}

interface TimelineData {
  orderId: string;
  deadline: string;
  projectedCompletionDate: string;
  status: 'on_track' | 'at_risk' | 'late';
  daysUntilDeadline: number;
  daysUntilProjectedCompletion: number;
  criticalPathTasks: string[];
  tasks: Task[];
}

const OrderTimelineEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [orderOwner, setOrderOwner] = useState<{ name: string; surname: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [invitingTaskId, setInvitingTaskId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; surname: string; email: string; departmentId?: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [taskInvitations, setTaskInvitations] = useState<Map<string, Array<{ id: string; inviteeId: string; inviterId: string; status: string; invitee?: { name: string; surname: string }; inviter?: { name: string; surname: string } }>>>(new Map());
  const [selectedView, setSelectedView] = useState<'timeline' | 'critical' | 'all'>('timeline');
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editFormData, setEditFormData] = useState({
    orderNumber: '',
    customerName: '',
    deadline: '',
    description: '',
    priority: OrderPriority.MEDIUM,
    equipmentIds: [] as string[],
  });
  const [editEquipmentSelections, setEditEquipmentSelections] = useState<Record<string, number>>({});
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    estimatedDays: 1,
    dependencies: [] as string[],
    assignedUserId: '' as string | undefined,
  });
  const [showRequisitionForm, setShowRequisitionForm] = useState(false);
  const [requisitionApproved, setRequisitionApproved] = useState<boolean | null>(null); // null = checking, true = approved, false = not approved or no requisition
  const [taskAssignmentEnabled, setTaskAssignmentEnabled] = useState<boolean>(false);
  const [currentRequisition, setCurrentRequisition] = useState<any>(null);
  const [requisitionApprovers, setRequisitionApprovers] = useState<Array<{ id: string; name: string; surname: string }>>([]);
  const [requisitionRejectors, setRequisitionRejectors] = useState<Array<{ id: string; name: string; surname: string }>>([]);
  const [requisitionPendingApprovers, setRequisitionPendingApprovers] = useState<Array<{ id: string; name: string; surname: string }>>([]);
  const [requisitionProofs, setRequisitionProofs] = useState<Array<{ id: string; fileName: string; uploadedBy: string; uploadedByName: string; uploadedAt: string; description?: string }>>([]);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskFormData, setEditTaskFormData] = useState({
    title: '',
    description: '',
    estimatedDays: 1,
    dependencies: [] as string[],
    status: TaskStatus.NOT_STARTED,
  });
  const { user } = useAuth();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [canEditTasks, setCanEditTasks] = useState<boolean>(false);
  const [canDeleteTasks, setCanDeleteTasks] = useState<boolean>(false);
  const [canEditOrders, setCanEditOrders] = useState<boolean>(false);
  const [canAddTask, setCanAddTask] = useState<boolean>(false);
  const [canAccessOrder, setCanAccessOrder] = useState<boolean>(true); // Default to true to prevent flash of restricted message
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchTimeline();
      fetchEquipment();
      fetchAllUsers();
      fetchDepartments();
      fetchProjectId();
    }
  }, [id]);

  const fetchProjectId = async () => {
    if (!id) return;
    try {
      const sessionId = localStorage.getItem('sessionId');
      
      // First, try to find a project by looking at tasks with this orderId
      const tasksResponse = await fetch(`${API_BASE_URL}/api/tasks?orderId=${id}`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      
      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        if (tasks.length > 0 && tasks[0].projectId) {
          setProjectId(tasks[0].projectId);
          return;
        }
      }
      
      // If no tasks found, try to get or create a project
      // First check if order exists
      const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        
        // Try to create a project for this order
        const createProjectResponse = await fetch(`${API_BASE_URL}/api/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId || '',
          },
          body: JSON.stringify({
            title: `Project for ${orderData.orderNumber || 'Order'}`,
            description: `Auto-created project for order ${orderData.orderNumber || id}`,
            status: 'in_progress',
            components: [],
            assignedTeamIds: [],
          }),
        });
        
        if (createProjectResponse.ok) {
          const newProject = await createProjectResponse.json();
          setProjectId(newProject.id);
        } else {
          // If creation fails (permission issue), we'll still show the button
          // and handle it when clicked
          console.warn('Could not create project automatically, will create on demand');
        }
      }
    } catch (error) {
      console.error('Failed to fetch project ID:', error);
    }
  };

  const handleCreateProjectForTimeTracking = async () => {
    if (!id || !order) return;
    try {
      const sessionId = localStorage.getItem('sessionId');
      const createProjectResponse = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          title: `Project for ${order.orderNumber || 'Order'}`,
          description: `Auto-created project for order ${order.orderNumber || id}`,
          status: 'in_progress',
          components: [],
          assignedTeamIds: [],
        }),
      });
      
      if (createProjectResponse.ok) {
        const newProject = await createProjectResponse.json();
        setProjectId(newProject.id);
        navigate(`/projects/${newProject.id}/time-tracking`);
      } else {
        const errorData = await createProjectResponse.json();
        alert(`Failed to create project: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  useEffect(() => {
    if (order) {
      checkRequisitionApproval();
    }
  }, [order, allUsers]);

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

  useEffect(() => {
    if (user && order) {
    checkTaskPermissions();
    checkOrderPermissions();
    checkOrderAccess();
    }
  }, [user, order, timeline, currentRequisition]);

  const checkTaskPermissions = async () => {
    if (!user) {
      setCanEditTasks(false);
      setCanDeleteTasks(false);
      return;
    }

    // Admin always has permission
    if (user.role === 'ADMIN' || user.role === 'admin') {
      setCanEditTasks(true);
      setCanDeleteTasks(true);
      return;
    }

    // For non-admin roles, check configuration
    try {
      const sessionId = localStorage.getItem('sessionId');
      const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
      const response = await fetch(`${API_BASE_URL}/api/configurations/role/${normalizedRole}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const config = await response.json();
        if (config.permissions) {
          try {
            const permissions = typeof config.permissions === 'string' 
              ? JSON.parse(config.permissions) 
              : config.permissions;
            setCanEditTasks(permissions.canEditTasks === true);
            setCanDeleteTasks(permissions.canDeleteTasks === true);
          } catch (e) {
            setCanEditTasks(false);
            setCanDeleteTasks(false);
          }
        } else {
          setCanEditTasks(false);
          setCanDeleteTasks(false);
        }
      } else {
        setCanEditTasks(false);
        setCanDeleteTasks(false);
      }
    } catch (error) {
      console.error('Failed to check task permissions:', error);
      setCanEditTasks(false);
      setCanDeleteTasks(false);
    }
  };

  const checkOrderPermissions = async () => {
    if (!user) {
      setCanEditOrders(false);
      setCanAddTask(false);
      return;
    }

    // Admin and Project Manager always have permission
    if (user.role === 'ADMIN' || user.role === 'admin' || user.role === 'PROJECT_MANAGER' || user.role === 'project_manager') {
      setCanEditOrders(true);
      setCanAddTask(true);
      return;
    }

    // For USER role, check configuration
    try {
      const sessionId = localStorage.getItem('sessionId');
      const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
      const response = await fetch(`${API_BASE_URL}/api/configurations/role/${normalizedRole}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const config = await response.json();
        if (config.permissions) {
          try {
            const permissions = typeof config.permissions === 'string' 
              ? JSON.parse(config.permissions) 
              : config.permissions;
            // Check for canEditProjects permission (with backward compatibility)
            setCanEditOrders(permissions.canEditProjects === true || permissions.canEditOrders === true);
            // Add Task is available if they can edit tasks or create projects
            setCanAddTask(permissions.canEditTasks === true || permissions.canCreateProjects === true || permissions.canCreateOrders === true);
          } catch (e) {
            setCanEditOrders(false);
            setCanAddTask(false);
          }
        } else {
          setCanEditOrders(false);
          setCanAddTask(false);
        }
      } else {
        setCanEditOrders(false);
        setCanAddTask(false);
      }
    } catch (error) {
      console.error('Failed to check order permissions:', error);
      setCanEditOrders(false);
      setCanAddTask(false);
    }
  };

  const checkOrderAccess = async () => {
    // Wait for user and order to load
    if (!user || !order) {
      setCanAccessOrder(true); // Default to true while loading
      return;
    }

    // All users can access all projects - no restrictions
    setCanAccessOrder(true);
  };

  useEffect(() => {
    if (timeline?.tasks) {
      fetchTaskInvitations();
    }
  }, [timeline?.tasks]);

  const fetchTaskInvitations = async () => {
    if (!timeline?.tasks || timeline.tasks.length === 0) return;
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      const invitationsMap = new Map();
      
      // Fetch all sent invitations
      const sentResponse = await fetch(`${API_BASE_URL}/api/invitations/sent`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      
      // Also fetch received invitations to get all invitations for tasks in this order
      const receivedResponse = await fetch(`${API_BASE_URL}/api/invitations/my-invitations`, {
        headers: { 'x-session-id': sessionId || '' },
      });
      
      const allInvitations: any[] = [];
      
      if (sentResponse.ok) {
        const sent = await sentResponse.json();
        allInvitations.push(...sent);
      }
      
      if (receivedResponse.ok) {
        const received = await receivedResponse.json();
        allInvitations.push(...received);
      }
      
      // Group invitations by task ID
      timeline.tasks.forEach((task) => {
        const taskInvitations = allInvitations.filter((inv: any) => inv.taskId === task.id);
        if (taskInvitations.length > 0) {
          // Get the most recent invitation with status
          const latestInvitation = taskInvitations.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          
          // Fetch invitee and inviter details
          const invitee = latestInvitation.invitee || allUsers.find(u => u.id === latestInvitation.inviteeId);
          const inviter = latestInvitation.inviter || allUsers.find(u => u.id === latestInvitation.inviterId);
          
          invitationsMap.set(task.id, [{
            id: latestInvitation.id,
            inviteeId: latestInvitation.inviteeId,
            inviterId: latestInvitation.inviterId,
            status: latestInvitation.status,
            invitee: invitee ? { name: invitee.name, surname: invitee.surname } : undefined,
            inviter: inviter ? { name: inviter.name, surname: inviter.surname } : undefined,
          }]);
        }
      });
      
      setTaskInvitations(invitationsMap);
    } catch (error) {
      console.error('Failed to fetch task invitations:', error);
    }
  };

  const checkRequisitionApproval = async () => {
    if (!order) return;
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/order/${order.id}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const requisitions = await response.json();
        // Check if there's an approved requisition
        const approvedRequisition = requisitions.find((r: any) => r.status === 'approved');
        if (approvedRequisition) {
          setRequisitionApproved(true);
          setCurrentRequisition(approvedRequisition);
          setTaskAssignmentEnabled(approvedRequisition.taskAssignmentEnabled || false);
          // Fetch approver names
          await fetchRequisitionApprovers(approvedRequisition);
          // Fetch proof documents
          await fetchRequisitionProofs(approvedRequisition.id);
        } else if (requisitions.length > 0) {
          // Check if any requisition is rejected
          const rejectedRequisition = requisitions.find((r: any) => r.status === 'rejected');
          if (rejectedRequisition) {
            setRequisitionApproved(false);
            setCurrentRequisition(rejectedRequisition);
            setTaskAssignmentEnabled(false);
            // Fetch approver names
            await fetchRequisitionApprovers(rejectedRequisition);
          } else {
            // There's a requisition but it's not approved yet (pending)
            setRequisitionApproved(false);
            setCurrentRequisition(requisitions[0]);
            setTaskAssignmentEnabled(false);
            // Fetch approver names
            await fetchRequisitionApprovers(requisitions[0]);
          }
        } else {
          // No requisition exists - disable task creation until requisition is created and approved
          setRequisitionApproved(false);
          setCurrentRequisition(null);
          setTaskAssignmentEnabled(false);
          setRequisitionApprovers([]);
          setRequisitionRejectors([]);
          setRequisitionPendingApprovers([]);
        }
      } else {
        // If no requisitions exist, disable task creation
        setRequisitionApproved(false);
        setCurrentRequisition(null);
        setTaskAssignmentEnabled(false);
        setRequisitionApprovers([]);
        setRequisitionRejectors([]);
        setRequisitionPendingApprovers([]);
      }
    } catch (error) {
      console.error('Failed to check requisition approval:', error);
      // On error, default to disabling task creation
      setRequisitionApproved(false);
      setCurrentRequisition(null);
      setTaskAssignmentEnabled(false);
      setRequisitionApprovers([]);
      setRequisitionRejectors([]);
      setRequisitionPendingApprovers([]);
    }
  };

  const fetchRequisitionApprovers = async (requisition: any) => {
    if (!requisition) {
      setRequisitionApprovers([]);
      setRequisitionRejectors([]);
      setRequisitionPendingApprovers([]);
      return;
    }

    try {
      // Get all approver IDs
      const approverIds = Array.isArray(requisition.approverIds) 
        ? requisition.approverIds 
        : (requisition.approverIds ? requisition.approverIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0) : []);
      
      // Get approved IDs
      const approvedByIds = Array.isArray(requisition.approvedByIds) 
        ? requisition.approvedByIds 
        : (requisition.approvedByIds ? requisition.approvedByIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0) : []);
      
      // Get rejected IDs
      const rejectedByIds = Array.isArray(requisition.rejectedByIds) 
        ? requisition.rejectedByIds 
        : (requisition.rejectedByIds ? requisition.rejectedByIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0) : []);
      
      // Find all approver user objects
      const allApprovers = approverIds
        .map((id: string) => allUsers.find((u: any) => u.id === id))
        .filter((u: any): u is { id: string; name: string; surname: string } => u !== undefined);
      
      // Separate into approved, rejected, and pending
      const approved = allApprovers.filter((a: { id: string; name: string; surname: string }) => approvedByIds.includes(a.id));
      const rejected = allApprovers.filter((a: { id: string; name: string; surname: string }) => rejectedByIds.includes(a.id));
      const pending = allApprovers.filter((a: { id: string; name: string; surname: string }) => !approvedByIds.includes(a.id) && !rejectedByIds.includes(a.id));
      
      setRequisitionApprovers(approved);
      setRequisitionRejectors(rejected);
      setRequisitionPendingApprovers(pending);
    } catch (error) {
      console.error('Failed to fetch requisition approvers:', error);
      setRequisitionApprovers([]);
      setRequisitionRejectors([]);
      setRequisitionPendingApprovers([]);
    }
  };

  const fetchRequisitionProofs = async (requisitionId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/${requisitionId}/proofs`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const proofs = await response.json();
        setRequisitionProofs(proofs);
      } else {
        setRequisitionProofs([]);
      }
    } catch (error) {
      console.error('Failed to fetch requisition proofs:', error);
      setRequisitionProofs([]);
    }
  };

  const handleDownloadProof = async (proofId: string, fileName: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/proofs/${proofId}/download`, {
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
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('Failed to download proof:', error);
      alert('Failed to download document');
    }
  };

  const handleEnableTaskAssignment = async () => {
    if (!currentRequisition || !currentRequisition.id) return;
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/requisitions/${currentRequisition.id}/enable-task-assignment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
      });

      if (response.ok) {
        setTaskAssignmentEnabled(true);
        alert('Task assignment enabled! You can now create tasks.');
        // Refresh requisition status
        await checkRequisitionApproval();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to enable task assignment');
      }
    } catch (error) {
      console.error('Failed to enable task assignment:', error);
      alert('Failed to enable task assignment');
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

  useEffect(() => {
    if (order?.createdBy) {
      fetchOrderOwner(order.createdBy);
    }

    // Auto-refresh every 1 second
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (id) {
          fetchTimeline();
        }
      }, 1000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [id, autoRefresh]);

  const fetchOrderOwner = async (userId: string) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const userData = await response.json();
        setOrderOwner({ name: userData.name, surname: userData.surname });
      }
    } catch (error) {
      console.error('Failed to fetch order owner:', error);
    }
  };


  const fetchOrder = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      console.log(`[OrderTimelineEnhanced] Fetching order ${id}...`);
      
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      console.log(`[OrderTimelineEnhanced] Response status: ${response.status} for order ${id}`);

      if (response.status === 403) {
        // Access denied - this shouldn't happen now, but handle it gracefully
        console.log(`[OrderTimelineEnhanced] Access denied (403) for order ${id}`);
        alert('Access denied. Please contact your administrator if you believe this is an error.');
        navigate('/orders');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log(`[OrderTimelineEnhanced] Order ${id} fetched successfully:`, data);
        setOrder(data);
      } else if (response.status === 404) {
        console.log(`[OrderTimelineEnhanced] Order ${id} not found (404)`);
        const errorData = await response.json().catch(() => ({ error: 'Order not found' }));
        console.warn(`[OrderTimelineEnhanced] Order not found:`, errorData);
        setOrder(null);
        // Don't show alert, just log the warning - user will see "Project not found" message
      } else if (response.status === 403) {
        console.log(`[OrderTimelineEnhanced] Access denied (403) for order ${id}`);
        const errorData = await response.json().catch(() => ({ error: 'Access denied' }));
        console.warn(`[OrderTimelineEnhanced] Access denied:`, errorData);
        setOrder(null);
        // Navigate back to orders list if access denied
        navigate('/orders');
      } else {
        console.error(`[OrderTimelineEnhanced] Unexpected response status ${response.status} for order ${id}`);
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch order' }));
        console.error(`[OrderTimelineEnhanced] Error data:`, errorData);
        setOrder(null);
      }
    } catch (error) {
      console.error(`[OrderTimelineEnhanced] Failed to fetch order ${id}:`, error);
      setOrder(null);
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

  const fetchTimeline = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}/timeline`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTimeline(data);
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}/recalculate`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setTimeline(data);
      }
    } catch (error) {
      console.error('Failed to recalculate timeline:', error);
    }
  };

  const handleEditOrder = () => {
    if (order) {
      const deadlineDate = new Date(order.deadline);
      const localDateTime = new Date(deadlineDate.getTime() - deadlineDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      
      // Normalize equipmentIds - handle both array and string (from simple-array)
      let equipmentIds: string[] = [];
      if (order.equipmentIds) {
        if (Array.isArray(order.equipmentIds)) {
          equipmentIds = order.equipmentIds;
        } else if (typeof order.equipmentIds === 'string' && order.equipmentIds.trim()) {
          equipmentIds = order.equipmentIds.split(',').filter((id: string) => id.trim());
        }
      }
      
      // Initialize equipment selections with quantities (default to 1)
      const selections: Record<string, number> = {};
      equipmentIds.forEach(id => {
        selections[id] = 1; // Default quantity
      });
      setEditEquipmentSelections(selections);
      
      setEditFormData({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        deadline: localDateTime,
        description: order.description || '',
        priority: order.priority,
        equipmentIds: equipmentIds,
      });
      setIsEditingOrder(true);
    }
  };

  const handleEditEquipmentToggle = (equipmentId: string, checked: boolean) => {
    setEditEquipmentSelections(prev => {
      const updated = { ...prev };
      if (checked) {
        updated[equipmentId] = updated[equipmentId] || 1;
      } else {
        delete updated[equipmentId];
      }
      return updated;
    });
  };

  const handleEditQuantityChange = (equipmentId: string, quantity: number) => {
    if (quantity < 1) return;
    setEditEquipmentSelections(prev => ({
      ...prev,
      [equipmentId]: quantity,
    }));
  };

  const handleSaveOrder = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          orderNumber: editFormData.orderNumber,
          customerName: editFormData.customerName,
          deadline: new Date(editFormData.deadline).toISOString(),
          description: editFormData.description,
          priority: editFormData.priority,
          equipmentIds: Object.keys(editEquipmentSelections).filter(id => editEquipmentSelections[id] > 0),
        }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrder(updatedOrder);
        setIsEditingOrder(false);
        // Recalculate timeline after deadline change
        await handleRecalculate();
        await fetchTimeline();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project');
    }
  };

  const handleEditTask = (task: Task) => {
    // Note: We no longer lock editing based on dependencies
    // Dependencies only prevent completion, not editing
    // Prerequisite tasks remain editable even when they have dependent tasks

    setEditTaskFormData({
      title: task.title,
      description: task.description,
      estimatedDays: Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)),
      dependencies: task.dependencies || [],
      status: task.status,
    });
    setEditingTaskId(task.id);
    setIsEditingTask(true);
    
    // Clear any previous validation (editing is always allowed)
    (window as any).__taskEditValidation = {
      incompleteDependencies: [],
      blockingTasks: [],
      isLocked: false, // Editing is never locked - only completion is restricted
    };
  };

  const handleSaveTask = async () => {
    if (!editingTaskId) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const task = (timeline?.tasks || []).find(t => t.id === editingTaskId);
      if (!task) return;

      // Validate dependencies are completed before allowing completion (not editing)
      // Only block if trying to mark as completed
      if (editTaskFormData.status === TaskStatus.COMPLETED) {
        if (editTaskFormData.dependencies && editTaskFormData.dependencies.length > 0 && timeline?.tasks) {
          const incompleteDeps = editTaskFormData.dependencies.filter((depId) => {
            const depTask = timeline.tasks.find((t) => t.id === depId);
            return depTask && depTask.status !== TaskStatus.COMPLETED;
          });
          
          if (incompleteDeps.length > 0) {
            const depTaskNames = incompleteDeps.map((depId) => {
              const depTask = timeline.tasks.find((t) => t.id === depId);
              return depTask?.title || depId;
            });
            alert(`Cannot complete this task. The following dependent tasks must be completed first:\n\n${depTaskNames.join(', ')}\n\nPlease complete the dependent tasks before marking this task as completed.`);
            return;
          }
        }
      }

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + editTaskFormData.estimatedDays);

      const response = await fetch(`${API_BASE_URL}/api/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          title: editTaskFormData.title,
          description: editTaskFormData.description,
          estimatedDays: editTaskFormData.estimatedDays,
          dependencies: editTaskFormData.dependencies,
          status: editTaskFormData.status,
          startDate: task.startDate,
          endDate: endDate.toISOString(),
        }),
      });

      if (response.ok) {
        setIsEditingTask(false);
        setEditingTaskId(null);
        // Clear validation
        delete (window as any).__taskEditValidation;
        // Recalculate timeline after editing task
        await handleRecalculate();
        await fetchTimeline();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  };

  const handleDownloadPDF = async () => {
    if (!order || !id) return;

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}/pdf`, {
        headers: { 'x-session-id': sessionId || '' },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Project-Report-${order.orderNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to download PDF' }));
        alert(`Failed to download PDF: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  // Old client-side PDF generation code removed - now using server-side API
  // This function is kept for reference but not used
  const handleDownloadPDF_OLD = async () => {
    if (!order || !timeline) return;

    try {
      // Dynamically import jspdf-autotable to ensure it's loaded
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = (autoTableModule as any).default || autoTableModule;
      const jsPDF = (await import('jspdf')).default;
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Helper to use autoTable - jspdf-autotable v5 uses function form
      const useAutoTable = (options: any) => {
        try {
          // Try function form first (v5+)
          if (typeof autoTable === 'function') {
            autoTable(doc, options);
            return (doc as any).lastAutoTable?.finalY;
          }
          // Fallback to method form (older versions)
          if (typeof (doc as any).autoTable === 'function') {
            (doc as any).autoTable(options);
            return (doc as any).lastAutoTable?.finalY;
          }
          throw new Error('autoTable is not available');
        } catch (error) {
          console.error('Error using autoTable:', error);
          // Fallback: create simple table manually
          return yPos + 50;
        }
      };
      let yPos = 20;

      // Add logo in top-left corner and orange banner
      let logoHeight = 20; // Default height
      let logoWidth = 25; // Default width
      let logoDataUrl: string | null = null;
      
      // Load the logo and get its dimensions
      try {
        const logoPath = '/Mitas logo.jpeg';
        const logoResponse = await fetch(logoPath);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          
          // Create an image element to get dimensions
          const img = new Image();
          img.src = logoDataUrl;
          await new Promise((resolve) => {
            img.onload = () => {
              // Calculate dimensions maintaining aspect ratio
              logoWidth = 25; // 25mm width
              logoHeight = (img.height / img.width) * logoWidth;
              resolve(null);
            };
            img.onerror = () => resolve(null); // Fallback if image fails to load
          });
        }
      } catch (error) {
        console.warn('Could not load logo:', error);
      }

      // Add orange banner/decoration extending from logo area with angular gloss bevel
      const bannerY = 10;
      const bannerHeight = Math.max(logoHeight, 20); // At least 20pt (7mm) thick, or match logo height
      
      // Base orange color (Mitas brand orange)
      const orangeBase = [249, 115, 22]; // #f97316
      const orangeLight = [255, 165, 0]; // Lighter orange for highlight
      const orangeDark = [220, 90, 15]; // Darker orange for shadow
      
      // Draw base banner rectangle
      doc.setFillColor(orangeBase[0], orangeBase[1], orangeBase[2]);
      doc.rect(14, bannerY, 260, bannerHeight, 'F');
      
      // Add angular gloss bevel effect - top highlight
      doc.setFillColor(orangeLight[0], orangeLight[1], orangeLight[2]);
      // Top bevel (lighter shade on top edge)
      doc.rect(14, bannerY, 260, bannerHeight * 0.3, 'F');
      
      // Add angular gloss bevel effect - bottom shadow
      doc.setFillColor(orangeDark[0], orangeDark[1], orangeDark[2]);
      // Bottom bevel (darker shade on bottom edge)
      doc.rect(14, bannerY + bannerHeight * 0.7, 260, bannerHeight * 0.3, 'F');
      
      // Add subtle gradient effect with angled lines
      doc.setFillColor(orangeBase[0], orangeBase[1], orangeBase[2]);
      // Middle section to blend
      doc.rect(14, bannerY + bannerHeight * 0.3, 260, bannerHeight * 0.4, 'F');

      // Now add the logo on top of the banner
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'JPEG', 14, 10, logoWidth, logoHeight);
        } catch (error) {
          console.warn('Could not add logo image:', error);
        }
      }

      // Title (positioned below the banner, centered)
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text
      const titleY = bannerY + bannerHeight + 8;
      doc.text('Project Details Report', 148, titleY, { align: 'center' });
      yPos = titleY + 12;

      // Project Information Section - Table format
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Information', 14, yPos);
      yPos += 8;

      const orderInfoData = [
        ['Project Number', order.orderNumber],
        ['Customer', order.customerName],
        ['Status', order.status.replace('_', ' ').toUpperCase()],
        ['Priority', order.priority.toUpperCase()],
        ['Description', order.description || 'N/A'],
      ];

      const orderInfoFinalY = useAutoTable({
        startY: yPos,
        head: [['Field', 'Value']],
        body: orderInfoData,
        theme: 'striped',
        headStyles: { 
          fillColor: [249, 115, 22], // Mitas orange
          textColor: 255, 
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: { 
          fontSize: 10,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [255, 250, 245] // Very light orange tint
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
          1: { cellWidth: 140, fillColor: [255, 255, 255] },
        },
      });

      yPos = orderInfoFinalY ? orderInfoFinalY + 10 : yPos + 50;

      // Timeline Status Section - Table format
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Timeline Status', 14, yPos);
      yPos += 8;

      const deadline = new Date(order.deadline);
      const projectedCompletion = new Date(timeline.projectedCompletionDate);
      
      const timelineStatusData = [
        ['Deadline Status', timeline.status.replace('_', ' ').toUpperCase()],
        ['Days Until Deadline', timeline.daysUntilDeadline > 0 ? `${timeline.daysUntilDeadline} days` : `${Math.abs(timeline.daysUntilDeadline)} days overdue`],
        ['Target Deadline', `${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}`],
        ['Projected Completion', `${projectedCompletion.toLocaleDateString()} ${projectedCompletion.toLocaleTimeString()}`],
      ];

      const timelineFinalY = useAutoTable({
        startY: yPos,
        head: [['Field', 'Value']],
        body: timelineStatusData,
        theme: 'striped',
        headStyles: { 
          fillColor: [249, 115, 22], // Mitas orange
          textColor: 255, 
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: { 
          fontSize: 10,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [255, 250, 245] // Very light orange tint
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
          1: { cellWidth: 140, fillColor: [255, 255, 255] },
        },
      });

      yPos = timelineFinalY ? timelineFinalY + 10 : yPos + 50;

      // Required Solution & Equipment Section - Table format
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Required Solution & Equipment', 14, yPos);
      yPos += 8;

      // Normalize equipmentIds
      let equipmentIds: string[] = [];
      if (order.equipmentIds) {
        if (Array.isArray(order.equipmentIds)) {
          equipmentIds = order.equipmentIds;
        } else if (typeof order.equipmentIds === 'string' && (order.equipmentIds as string).trim()) {
          equipmentIds = (order.equipmentIds as string).split(',').filter((id: string) => id.trim());
        }
      }

      const equipmentData: string[][] = [];
      if (equipmentIds.length > 0) {
        const solutions = equipmentIds
          .map(id => equipment.find(e => e.id === id.trim()))
          .filter((eq): eq is { id: string; name: string; category?: string } => 
            eq !== undefined && eq.category === 'solution'
          );
        
        const technologies = equipmentIds
          .map(id => equipment.find(e => e.id === id.trim()))
          .filter((eq): eq is { id: string; name: string; category?: string } => 
            eq !== undefined && eq.category === 'technology'
          );

        solutions.forEach((eq) => {
          equipmentData.push(['Solution', eq.name]);
        });

        technologies.forEach((eq) => {
          equipmentData.push(['Technology', eq.name]);
        });
      }

      if (equipmentData.length > 0) {
        const equipmentFinalY = useAutoTable({
          startY: yPos,
          head: [['Category', 'Name']],
          body: equipmentData,
          theme: 'striped',
          headStyles: { 
            fillColor: [249, 115, 22], // Mitas orange
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'left'
          },
          styles: { 
            fontSize: 10,
            cellPadding: 3
          },
          alternateRowStyles: {
            fillColor: [255, 250, 245] // Very light orange tint
          },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255] },
            1: { cellWidth: 140, fillColor: [255, 255, 255] },
          },
        });
        yPos = equipmentFinalY ? equipmentFinalY + 10 : yPos + 50;
      } else {
        const equipmentFinalY = useAutoTable({
          startY: yPos,
          head: [['Category', 'Name']],
          body: [['N/A', 'No equipment specified']],
          theme: 'striped',
          headStyles: { 
            fillColor: [249, 115, 22], // Mitas orange
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'left'
          },
          styles: { 
            fontSize: 10,
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 140 },
          },
        });
        yPos = equipmentFinalY ? equipmentFinalY + 10 : yPos + 30;
      }

      // Tasks Section
      if (timeline.tasks && timeline.tasks.length > 0) {
        // Check if we need a new page (landscape height is ~200mm)
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Tasks', 14, yPos);
        yPos += 8;

        // Prepare task data for table
        const taskData = timeline.tasks.map((task) => {
          const startDate = new Date(task.startDate);
          const endDate = new Date(task.endDate);
          const isCritical = task.isCritical || (timeline.criticalPathTasks || []).includes(task.id);
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Truncate description if too long
          const description = task.description || '';
          const shortDescription = description.length > 50 ? description.substring(0, 47) + '...' : description;
          
          return [
            task.title,
            shortDescription || '-',
            task.status.replace('_', ' '),
            startDate.toLocaleDateString() + ' ' + startDate.toLocaleTimeString(),
            endDate.toLocaleDateString() + ' ' + endDate.toLocaleTimeString(),
            `${duration} days`,
            isCritical ? 'Yes' : 'No',
            task.slackDays !== undefined ? `${task.slackDays} days` : '-',
            task.dependencies && task.dependencies.length > 0 ? `${task.dependencies.length} task(s)` : 'None',
          ];
        });

        const finalY = useAutoTable({
          startY: yPos,
          head: [['Task', 'Description', 'Status', 'Start Date', 'End Date', 'Duration', 'Critical', 'Slack', 'Dependencies']],
          body: taskData,
          theme: 'striped',
          headStyles: { 
            fillColor: [249, 115, 22], // Mitas orange
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'left'
          },
          styles: { 
            fontSize: 9,
            cellPadding: 2
          },
          alternateRowStyles: {
            fillColor: [255, 250, 245] // Very light orange tint
          },
          columnStyles: {
            0: { cellWidth: 35, fillColor: [255, 255, 255] },
            1: { cellWidth: 40, fillColor: [255, 255, 255] },
            2: { cellWidth: 20, fillColor: [255, 255, 255] },
            3: { cellWidth: 35, fillColor: [255, 255, 255] },
            4: { cellWidth: 35, fillColor: [255, 255, 255] },
            5: { cellWidth: 20, fillColor: [255, 255, 255] },
            6: { cellWidth: 18, fillColor: [255, 255, 255] },
            7: { cellWidth: 18, fillColor: [255, 255, 255] },
            8: { cellWidth: 25, fillColor: [255, 255, 255] },
          },
        });

        yPos = finalY ? finalY + 10 : yPos + 100; // Fallback if finalY not available
      }

      // Critical Path Section
      if (timeline.criticalPathTasks && timeline.criticalPathTasks.length > 0) {
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Critical Path Analysis', 14, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${timeline.criticalPathTasks.length} task(s) on the critical path`, 14, yPos);
        yPos += 6;
        doc.text('Critical path tasks have zero slack time. Any delay in these tasks will directly impact the deadline.', 14, yPos);
        yPos += 8;

        const criticalTasks = (timeline.tasks || [])
          .filter((t) => (timeline.criticalPathTasks || []).includes(t.id))
          .map(t => t.title);

        if (criticalTasks.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Critical Tasks:', 20, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          criticalTasks.forEach((taskTitle) => {
            doc.text(`  • ${taskTitle}`, 20, yPos);
            yPos += 6;
          });
        }
      }

      // Footer (landscape: width ~297mm, height ~210mm)
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          148,
          200,
          { align: 'center' }
        );
      }

      // Save the PDF
      doc.save(`Project-${order.orderNumber}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'x-session-id': sessionId || '',
        },
      });

      if (response.ok) {
        // Recalculate timeline after deleting task
        await handleRecalculate();
        await fetchTimeline();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  };

  const handleAddTask = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + taskFormData.estimatedDays);

      // First, try to find or create a project for this order
      // Check if there's a project associated with this order
      let projectId = '';
      try {
        const projectsResponse = await fetch(`${API_BASE_URL}/api/projects?orderId=${id}`, {
          headers: { 'x-session-id': sessionId || '' },
        });
        if (projectsResponse.ok) {
          const projects = await projectsResponse.json();
          if (projects.length > 0) {
            projectId = projects[0].id;
          }
        }
      } catch (e) {
        console.log('No existing project found for order');
      }

      // If no project exists, create one for this order
      if (!projectId) {
        const createProjectResponse = await fetch(`${API_BASE_URL}/api/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId || '',
          },
          body: JSON.stringify({
            title: `Project for ${order?.orderNumber || 'Project'}`,
            description: `Auto-created project for project ${order?.orderNumber || id}`,
            status: 'in_progress',
            components: [],
            assignedTeamIds: [],
          }),
        });
        if (createProjectResponse.ok) {
          const newProject = await createProjectResponse.json();
          projectId = newProject.id;
          setProjectId(newProject.id); // Update state
        } else {
          // Fallback: use order ID as project ID (may need to update Task entity to allow this)
          projectId = id || '';
        }
      } else {
        setProjectId(projectId); // Update state with found project
      }

      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({
          projectId: projectId,
          orderId: id,
          title: taskFormData.title,
          description: taskFormData.description,
          status: TaskStatus.NOT_STARTED,
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          estimatedDays: taskFormData.estimatedDays,
          dependencies: taskFormData.dependencies,
          assignedUserId: taskFormData.assignedUserId || undefined,
          isCritical: false,
          milestone: false,
        }),
      });

      if (response.ok) {
        setIsAddingTask(false);
        setTaskFormData({ title: '', description: '', estimatedDays: 1, dependencies: [], assignedUserId: '' });
        // Recalculate timeline after adding task
        await handleRecalculate();
        await fetchTimeline();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'on_track':
        return '#27ae60';
      case 'at_risk':
        return '#f39c12';
      case 'late':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getTaskStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.IN_PROGRESS:
        return '#3498db';
      case TaskStatus.COMPLETED:
        return '#27ae60';
      case TaskStatus.BLOCKED:
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  if (loading) {
    return <div className="order-timeline-loading">Loading timeline...</div>;
  }

  if (!order || !timeline) {
    return <div className="order-timeline-error">Project not found</div>;
  }

  const deadline = new Date(order.deadline);
  const projectedCompletion = new Date(timeline.projectedCompletionDate);
  const isOverdue = deadline < new Date() && order.status !== OrderStatus.COMPLETED;

  const filteredTasks = 
    selectedView === 'critical'
      ? (timeline.tasks || []).filter((t) => t.isCritical || (timeline.criticalPathTasks || []).includes(t.id))
      : selectedView === 'timeline'
      ? (timeline.tasks || []).filter((t) => t.status !== TaskStatus.COMPLETED)
      : (timeline.tasks || []);

  // All users can access all projects - no restrictions

  return (
    <div className="order-timeline">
      <div className="order-timeline-header">
        <Link to="/orders" className="back-link">← Back to Projects</Link>
        <div className="header-content">
          <div>
            <h1>{order.orderNumber}</h1>
            <p className="order-customer">{order.customerName}</p>
            {order.description && <p className="order-description">{order.description}</p>}
            {orderOwner && (
              <p className="order-owner" style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                Owner: {orderOwner.name} {orderOwner.surname}
              </p>
            )}
          </div>
          <div className="header-actions">
            {canAccessOrder && (canEditOrders || user?.role === 'ADMIN' || user?.role === 'admin' || user?.role === 'PROJECT_MANAGER' || user?.role === 'project_manager') && (
              <button onClick={handleEditOrder} className="btn-secondary">
                Edit Project
              </button>
            )}
            {canAccessOrder && (canAddTask || user?.role === 'ADMIN' || user?.role === 'admin' || user?.role === 'PROJECT_MANAGER' || user?.role === 'project_manager') && (
              <>
                {requisitionApproved === true && !taskAssignmentEnabled && currentRequisition && (
                  <button 
                    onClick={handleEnableTaskAssignment} 
                    className="btn-primary"
                    title="Enable task assignment for this approved requisition"
                  >
                    Enable Task Assignment
                  </button>
                )}
                <button 
                  onClick={() => setIsAddingTask(true)} 
                  className="btn-secondary"
                  disabled={requisitionApproved === false || (requisitionApproved === true && !taskAssignmentEnabled && currentRequisition)}
                  title={
                    requisitionApproved === false && !currentRequisition
                      ? 'Create and get a requisition approved before creating tasks'
                      : requisitionApproved === false && currentRequisition
                      ? 'Requisition must be approved before creating tasks'
                      : (requisitionApproved === true && !taskAssignmentEnabled && currentRequisition)
                      ? 'Please enable task assignment first'
                      : 'Add Task'
                  }
                >
                  Add Task
                </button>
              </>
            )}
            <button onClick={handleDownloadPDF} className="btn-secondary" title="Download Project as PDF">
              📄 Download PDF
            </button>
            {/* Time Tracking Button - Always visible */}
            <button 
              style={{ backgroundColor: '#4a90e2', color: 'white', border: '2px solid #357abd' }}
              onClick={async () => {
                console.log('[Time Tracking] Button clicked, orderId:', id, 'current projectId:', projectId);
                // Ensure project exists before navigating
                let currentProjectId = projectId;
                
                if (!currentProjectId) {
                  // Try to find project from tasks
                  const sessionId = localStorage.getItem('sessionId');
                  const tasksResponse = await fetch(`${API_BASE_URL}/api/tasks?orderId=${id}`, {
                    headers: { 'x-session-id': sessionId || '' },
                  });
                  
                  if (tasksResponse.ok) {
                    const tasks = await tasksResponse.json();
                    if (tasks.length > 0 && tasks[0].projectId) {
                      currentProjectId = tasks[0].projectId;
                      setProjectId(currentProjectId);
                    }
                  }
                  
                  // If still no project, create one
                  if (!currentProjectId && order) {
                    await handleCreateProjectForTimeTracking();
                    return; // handleCreateProjectForTimeTracking will navigate
                  }
                }
                
                if (currentProjectId) {
                  // Store orderId in sessionStorage so we can navigate back
                  if (id) {
                    sessionStorage.setItem(`timeTracking_orderId_${currentProjectId}`, id);
                  }
                  navigate(`/projects/${currentProjectId}/time-tracking`);
                } else {
                  alert('Unable to access time tracking. Please try again.');
                }
              }}
              className="btn-secondary"
              title="View and manage time tracking for this project"
            >
              ⏱️ Time Tracking
            </button>
            <button onClick={handleRecalculate} className="btn-secondary">
              Recalculate Timeline
            </button>
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (10s)
            </label>
          </div>
        </div>
      </div>

      <div className="timeline-status-card">
        <div className="status-section">
          <div className="status-item">
            <span className="status-label">Deadline Status:</span>
            <span
              className="status-badge-large"
              style={{ backgroundColor: getStatusColor(timeline.status) }}
            >
              {timeline.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Days Until Deadline:</span>
            <span className={isOverdue ? 'overdue-large' : 'days-large'}>
              {timeline.daysUntilDeadline > 0
                ? `${timeline.daysUntilDeadline} days`
                : `${Math.abs(timeline.daysUntilDeadline)} days overdue`}
            </span>
          </div>
        </div>
        <div className="dates-section">
          <div className="date-item">
            <strong>Target Deadline:</strong>
            <span className={isOverdue ? 'overdue' : ''}>
              {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}
            </span>
          </div>
          <div className="date-item">
            <strong>Projected Completion:</strong>
            <span
              className={
                projectedCompletion > deadline ? 'late-projection' : 'on-time-projection'
              }
            >
              {projectedCompletion.toLocaleDateString()}{' '}
              {projectedCompletion.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="equipment-section">
          <strong className="equipment-section-title">Required Solution & Equipment:</strong>
          {(() => {
            // Normalize equipmentIds - handle both array and string (from simple-array)
            let equipmentIds: string[] = [];
            if (order?.equipmentIds) {
              if (Array.isArray(order.equipmentIds)) {
                equipmentIds = order.equipmentIds;
              } else if (typeof order.equipmentIds === 'string' && order.equipmentIds.trim()) {
                equipmentIds = order.equipmentIds.split(',').filter((id: string) => id.trim());
              }
            }
            
            if (equipmentIds.length === 0) {
              return <div className="no-equipment">No equipment specified</div>;
            }
            
            // Group equipment by category
            const solutions = equipmentIds
              .map(id => equipment.find(e => e.id === id.trim()))
              .filter((eq): eq is { id: string; name: string; category?: string } => 
                eq !== undefined && eq.category === 'solution'
              );
            
            const technologies = equipmentIds
              .map(id => equipment.find(e => e.id === id.trim()))
              .filter((eq): eq is { id: string; name: string; category?: string } => 
                eq !== undefined && eq.category === 'technology'
              );
            
            return (
              <div className="equipment-columns">
                {solutions.length > 0 && (
                  <div className="equipment-column">
                    <div className="equipment-column-header">Solution</div>
                    <ul className="equipment-items">
                      {solutions.map((eq) => (
                        <li key={eq.id}>{eq.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {technologies.length > 0 && (
                  <div className="equipment-column">
                    <div className="equipment-column-header">Technology</div>
                    <ul className="equipment-items">
                      {technologies.map((eq) => (
                        <li key={eq.id}>{eq.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
          {(() => {
            // Normalize equipmentIds - handle both array and string (from simple-array)
            let equipmentIds: string[] = [];
            if (order?.equipmentIds) {
              if (Array.isArray(order.equipmentIds)) {
                equipmentIds = order.equipmentIds;
              } else if (typeof order.equipmentIds === 'string' && order.equipmentIds.trim()) {
                equipmentIds = order.equipmentIds.split(',').filter((id: string) => id.trim());
              }
            }
            
            if (equipmentIds.length > 0) {
              const equipmentItems = equipmentIds
                .map(id => {
                  const eq = equipment.find(e => e.id === id.trim());
                  if (eq) {
                    // Try to get quantity from order if stored, otherwise default to 1
                    return {
                      id: eq.id,
                      name: eq.name,
                      category: eq.category || 'technology',
                      quantity: 1, // Default quantity, can be enhanced later
                    };
                  }
                  return null;
                })
                .filter((item): item is { id: string; name: string; category: 'technology' | 'solution'; quantity: number } => item !== null);
              
              // Check if there's a requisition and show status
              const hasRequisition = currentRequisition !== null;
              const requisitionStatus = currentRequisition?.status;
              
              return (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => setShowRequisitionForm(true)}
                    className="btn-procurement"
                  >
                    Get Requisition to begin project
                  </button>
                  {hasRequisition && requisitionStatus === 'pending_approval' && requisitionRejectors.length === 0 && (
                    <div style={{ 
                      padding: '8px 12px', 
                      background: 'rgba(251, 191, 36, 0.15)', 
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '6px',
                      color: '#fbbf24',
                      fontSize: '0.875rem'
                    }}>
                      Waiting for {requisitionPendingApprovers.map(a => `${a.name} ${a.surname}`).join('/')} to approve of technology and/or solution
                    </div>
                  )}
                  {hasRequisition && requisitionStatus === 'pending_approval' && requisitionRejectors.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ 
                        padding: '8px 12px', 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontSize: '0.875rem'
                      }}>
                        Rejection from {requisitionRejectors.map(a => `${a.name} ${a.surname}`).join('/')} has been given for this requisition
                      </div>
                      {requisitionPendingApprovers.length > 0 && (
                        <div style={{ 
                          padding: '8px 12px', 
                          background: 'rgba(251, 191, 36, 0.15)', 
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          fontSize: '0.875rem'
                        }}>
                          A second approval has been sent to {requisitionPendingApprovers.map(a => `${a.name} ${a.surname}`).join('/')} because {requisitionRejectors.map(a => `${a.name} ${a.surname}`).join('/')} rejected
                        </div>
                      )}
                    </div>
                  )}
                  {hasRequisition && requisitionStatus === 'approved' && (
                    <div style={{ 
                      padding: '12px', 
                      background: 'rgba(34, 197, 94, 0.15)', 
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '6px',
                      color: '#22c55e',
                      fontSize: '0.875rem'
                    }}>
                      <div style={{ marginBottom: requisitionProofs.length > 0 ? '8px' : '0' }}>
                        Approval from {requisitionApprovers.map(a => `${a.name} ${a.surname}`).join('/')} has been given for this requisition
                      </div>
                      {requisitionProofs.length > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(34, 197, 94, 0.2)' }}>
                          <div style={{ fontSize: '0.75rem', color: '#86efac', marginBottom: '6px', fontWeight: 600 }}>
                            Proof Documents ({requisitionProofs.length}):
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {requisitionProofs.map((proof) => (
                              <div 
                                key={proof.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '4px 8px',
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s',
                                }}
                                onClick={() => handleDownloadProof(proof.id, proof.fileName)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                                }}
                                title={`Click to download: ${proof.fileName}`}
                              >
                                <span style={{ fontSize: '1rem' }}>📎</span>
                                <span style={{ flex: 1, fontSize: '0.75rem' }}>{proof.fileName}</span>
                                {proof.description && (
                                  <span style={{ fontSize: '0.7rem', color: '#86efac', fontStyle: 'italic' }}>
                                    {proof.description}
                                  </span>
                                )}
                                <span style={{ fontSize: '0.7rem', color: '#86efac' }}>
                                  by {proof.uploadedByName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {hasRequisition && requisitionStatus === 'rejected' && (
                    <div style={{ 
                      padding: '8px 12px', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: '#ef4444',
                      fontSize: '0.875rem'
                    }}>
                      {requisitionRejectors.length > 0 
                        ? `Rejection from ${requisitionRejectors.map(a => `${a.name} ${a.surname}`).join('/')} has been given for this requisition`
                        : 'Rejection has been given for this requisition'}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {showRequisitionForm && order && (() => {
        // Get equipment items with quantities
        let equipmentIds: string[] = [];
        if (order.equipmentIds) {
          if (Array.isArray(order.equipmentIds)) {
            equipmentIds = order.equipmentIds;
          } else if (typeof order.equipmentIds === 'string' && (order.equipmentIds as string).trim()) {
            equipmentIds = (order.equipmentIds as string).split(',').filter((id: string) => id.trim());
          }
        }
        
        const equipmentItems = equipmentIds
          .map(id => {
            const eq = equipment.find(e => e.id === id.trim());
            if (eq) {
              return {
                id: eq.id,
                name: eq.name,
                category: (eq.category || 'technology') as 'technology' | 'solution',
                quantity: 1, // Default quantity
              };
            }
            return null;
          })
          .filter((item): item is { id: string; name: string; category: 'technology' | 'solution'; quantity: number } => item !== null);
        
        return (
          <RequisitionForm
            orderId={order.id}
            equipmentItems={equipmentItems}
            onClose={() => setShowRequisitionForm(false)}
            onSuccess={() => {
              setShowRequisitionForm(false);
              // Optionally refresh data
            }}
          />
        );
      })()}

      <div className="view-selector">
        <button
          className={selectedView === 'timeline' ? 'active' : ''}
          onClick={() => setSelectedView('timeline')}
        >
          Active Tasks
        </button>
        <button
          className={selectedView === 'critical' ? 'active' : ''}
          onClick={() => setSelectedView('critical')}
        >
          Critical Path
        </button>
        <button
          className={selectedView === 'all' ? 'active' : ''}
          onClick={() => setSelectedView('all')}
        >
          All Tasks
        </button>
      </div>

      <div className="timeline-content">
        <div className="tasks-section">
          <h2>
            {selectedView === 'critical'
              ? 'Critical Path Tasks'
              : selectedView === 'timeline'
              ? 'Active Timeline Tasks'
              : 'All Tasks'}
          </h2>
          <div className="tasks-list">
            {filteredTasks.map((task) => {
              const startDate = new Date(task.startDate);
              const endDate = new Date(task.endDate);
              const isCritical = task.isCritical || (timeline.criticalPathTasks || []).includes(task.id);

              return (
                <div
                  key={task.id}
                  className={`task-item ${isCritical ? 'critical' : ''} ${task.status === TaskStatus.COMPLETED ? 'completed' : ''}`}
                >
                  <div className="task-header">
                    <h3>{task.title}</h3>
                    <div className="task-badges">
                      <span
                        className="task-status-badge"
                        style={{ backgroundColor: getTaskStatusColor(task.status) }}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      {isCritical && <span className="critical-badge">CRITICAL PATH</span>}
                      {task.slackDays !== undefined && task.slackDays > 0 && (
                        <span className="slack-badge">{task.slackDays} days slack</span>
                      )}
                    </div>
                  </div>
                  <p className="task-description">{task.description}</p>
                  
                  {/* Task Assignment History */}
                  <div className="task-assignment">
                    {(() => {
                      const invitations = taskInvitations.get(task.id) || [];
                      const acceptedInvitation = invitations.find((inv: any) => inv.status === 'accepted');
                      const rejectedInvitation = invitations.find((inv: any) => inv.status === 'rejected');
                      
                      // Determine original and current assignees
                      let originalAssignee = null;
                      let currentAssignee = null;
                      
                      if (acceptedInvitation) {
                        // When invitation is accepted:
                        // - Original assignee is the inviter (person who sent the invitation - they had the task)
                        // - Current assignee is the invitee (who accepted and now has the task)
                        originalAssignee = acceptedInvitation.inviter
                          ? allUsers.find(u => u.id === acceptedInvitation.inviterId) || { name: acceptedInvitation.inviter.name, surname: acceptedInvitation.inviter.surname }
                          : null;
                        currentAssignee = allUsers.find(u => u.id === acceptedInvitation.inviteeId);
                      } else if (rejectedInvitation) {
                        // Invitation was rejected, original assignee still has the task
                        originalAssignee = task.assignedUserId 
                          ? allUsers.find(u => u.id === task.assignedUserId)
                          : null;
                        currentAssignee = originalAssignee;
                      } else {
                        // No invitation, so current assignee is the original
                        originalAssignee = task.assignedUserId 
                          ? allUsers.find(u => u.id === task.assignedUserId)
                          : null;
                        currentAssignee = originalAssignee;
                      }
                      
                      return (
                        <>
                          {originalAssignee && (
                            <div className="assignment-line" style={{ 
                              opacity: acceptedInvitation ? 0.5 : 1,
                              textDecoration: acceptedInvitation ? 'line-through' : 'none',
                              color: acceptedInvitation ? '#94a3b8' : '#f1f5f9'
                            }}>
                              <strong>Assigned:</strong> {originalAssignee.name} {originalAssignee.surname}
                            </div>
                          )}
                          {acceptedInvitation && currentAssignee && (
                            <div className="assignment-line" style={{ color: '#2ECC71' }}>
                              <strong>2nd Assigned Accepted:</strong> {currentAssignee.name} {currentAssignee.surname}
                            </div>
                          )}
                          {rejectedInvitation && !acceptedInvitation && (
                            <div className="assignment-line" style={{ color: '#E74C3C' }}>
                              <strong>2nd Assigned Rejected:</strong> {rejectedInvitation.invitee?.name} {rejectedInvitation.invitee?.surname}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="task-dates">
                    <div className="date-range">
                      <span className="date-label">Start:</span>
                      <span>{startDate.toLocaleDateString()} {startDate.toLocaleTimeString()}</span>
                    </div>
                    <div className="date-range">
                      <span className="date-label">End:</span>
                      <span>{endDate.toLocaleDateString()} {endDate.toLocaleTimeString()}</span>
                    </div>
                    <div className="duration">
                      Duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                  {task.dependencies && task.dependencies.length > 0 && (
                    <div className="task-dependencies">
                      <strong>Depends on:</strong> {task.dependencies.length} task(s)
                    </div>
                  )}
                  <div className="task-actions">
                    <button 
                      onClick={() => {
                        setInvitingTaskId(task.id);
                        setIsInvitingUser(true);
                        setInviteEmail('');
                        setInviteMessage('');
                      }}
                      className="btn-secondary"
                      title="Invite User to Task"
                    >
                      Invite User
                    </button>
                    {(user?.role === 'ADMIN' || user?.role === 'admin' || user?.role === 'PROJECT_MANAGER' || user?.role === 'project_manager' || canEditTasks) && (
                      <button 
                        onClick={() => handleEditTask(task)} 
                        className="btn-edit-task"
                        title="Edit Task"
                      >
                        Edit
                      </button>
                    )}
                    {(user?.role === 'ADMIN' || user?.role === 'admin' || user?.role === 'PROJECT_MANAGER' || user?.role === 'project_manager' || canDeleteTasks) && (
                      <button 
                        onClick={() => handleDeleteTask(task.id)} 
                        className="btn-delete-task"
                        title="Delete Task"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="empty-state">No tasks match the selected view.</div>
            )}
          </div>
        </div>

        <div className="critical-path-section">
          <h2>Critical Path Analysis</h2>
          <div className="critical-path-info">
            <p>
              <strong>{(timeline.criticalPathTasks || []).length}</strong> task(s) on the critical path
            </p>
            <p className="info-text">
              Critical path tasks have zero slack time. Any delay in these tasks will directly
              impact the deadline.
            </p>
            {(timeline.criticalPathTasks || []).length > 0 && (
              <ul className="critical-tasks-list">
                {(timeline.tasks || [])
                  .filter((t) => (timeline.criticalPathTasks || []).includes(t.id))
                  .map((task) => (
                    <li key={task.id}>{task.title}</li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      {isEditingOrder && (
        <div className="modal-overlay" onClick={() => setIsEditingOrder(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Project</h2>
            <div className="form-group">
              <label>Project Number / Reference *</label>
              <input
                type="text"
                value={editFormData.orderNumber}
                onChange={(e) => setEditFormData({ ...editFormData, orderNumber: e.target.value })}
                required
                placeholder="e.g., ORD-2024-001"
              />
            </div>
            <div className="form-group">
              <label>Client / Customer Name *</label>
              <input
                type="text"
                value={editFormData.customerName}
                onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                required
                placeholder="Enter client name"
              />
            </div>
            <div className="form-group">
              <label>Target Deadline *</label>
              <input
                type="datetime-local"
                value={editFormData.deadline}
                onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Priority *</label>
              <select
                value={editFormData.priority}
                onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as OrderPriority })}
                required
              >
                <option value={OrderPriority.LOW}>Low</option>
                <option value={OrderPriority.MEDIUM}>Medium</option>
                <option value={OrderPriority.HIGH}>High</option>
                <option value={OrderPriority.URGENT}>Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
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
                                checked={!!editEquipmentSelections[tech.id] && editEquipmentSelections[tech.id] > 0}
                                onChange={(e) => handleEditEquipmentToggle(tech.id, e.target.checked)}
                                className="equipment-checkbox"
                              />
                            </td>
                            <td className="quantity-col">
                              {editEquipmentSelections[tech.id] > 0 ? (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={editEquipmentSelections[tech.id] || 1}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    if (value) {
                                      handleEditQuantityChange(tech.id, parseInt(value) || 1);
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
                                checked={!!editEquipmentSelections[solution.id] && editEquipmentSelections[solution.id] > 0}
                                onChange={(e) => handleEditEquipmentToggle(solution.id, e.target.checked)}
                                className="equipment-checkbox"
                              />
                            </td>
                            <td className="quantity-col">
                              {editEquipmentSelections[solution.id] > 0 ? (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={editEquipmentSelections[solution.id] || 1}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    if (value) {
                                      handleEditQuantityChange(solution.id, parseInt(value) || 1);
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
            <div className="modal-actions">
              <button onClick={() => setIsEditingOrder(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveOrder} className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="modal-overlay" onClick={() => setIsAddingTask(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Task to Order</h2>
            <div className="form-group">
              <label>Task Title *</label>
              <input
                type="text"
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                required
                placeholder="Enter task title"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                rows={3}
                placeholder="Enter task description"
              />
            </div>
            <div className="form-group">
              <label>Estimated Days *</label>
              <input
                type="number"
                min="1"
                value={taskFormData.estimatedDays}
                onChange={(e) => setTaskFormData({ ...taskFormData, estimatedDays: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
            <div className="form-group">
              <label>Assign To (optional)</label>
              <select
                value={taskFormData.assignedUserId || ''}
                onChange={(e) => setTaskFormData({ ...taskFormData, assignedUserId: e.target.value || '' })}
              >
                <option value="">-- Select User --</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.surname} {user.departmentId ? `(${user.departmentId})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Dependencies (optional)</label>
              <select
                multiple
                value={taskFormData.dependencies}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setTaskFormData({ ...taskFormData, dependencies: selected });
                }}
                style={{ minHeight: '100px' }}
              >
                {(timeline?.tasks || []).map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <small>Hold Ctrl/Cmd to select multiple dependencies</small>
            </div>
            <div className="modal-actions">
              <button onClick={() => setIsAddingTask(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddTask} className="btn-primary" disabled={!taskFormData.title}>
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditingTask && (
        <div className="modal-overlay" onClick={() => setIsEditingTask(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Task</h2>
            
            <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={editTaskFormData.title}
                  onChange={(e) => setEditTaskFormData({ ...editTaskFormData, title: e.target.value })}
                  required
                  placeholder="Enter task title"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editTaskFormData.description}
                  onChange={(e) => setEditTaskFormData({ ...editTaskFormData, description: e.target.value })}
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>
              <div className="form-group">
                <label>Estimated Days *</label>
                <input
                  type="number"
                  min="1"
                  value={editTaskFormData.estimatedDays}
                  onChange={(e) => setEditTaskFormData({ ...editTaskFormData, estimatedDays: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={editTaskFormData.status}
                  onChange={(e) => setEditTaskFormData({ ...editTaskFormData, status: e.target.value as TaskStatus })}
                  required
                >
                  <option value={TaskStatus.NOT_STARTED}>Not Started</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                  <option value={TaskStatus.BLOCKED}>Blocked</option>
                </select>
                {editTaskFormData.status === TaskStatus.COMPLETED && editTaskFormData.dependencies && editTaskFormData.dependencies.length > 0 && (
                  <small style={{ color: '#fbbf24', display: 'block', marginTop: '4px' }}>
                    ⚠️ Note: This task cannot be marked as completed until all dependent tasks are completed.
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Dependencies (optional)</label>
                <select
                  multiple
                  value={editTaskFormData.dependencies}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setEditTaskFormData({ ...editTaskFormData, dependencies: selected });
                  }}
                  style={{ minHeight: '100px' }}
                >
                  {(timeline?.tasks || []).filter(t => t.id !== editingTaskId).map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
                <small>Hold Ctrl/Cmd to select multiple dependencies</small>
              </div>
              <div className="modal-actions">
                <button onClick={() => {
                  delete (window as any).__taskEditValidation;
                  setIsEditingTask(false);
                }} className="btn-secondary">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveTask} 
                  className="btn-primary" 
                  disabled={!editTaskFormData.title}
                >
                  Save Changes
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {isInvitingUser && (
        <div className="modal-overlay" onClick={() => setIsInvitingUser(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Invite User to Task</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteEmail || !invitingTaskId) return;

                try {
                  const sessionId = localStorage.getItem('sessionId');
                  const response = await fetch(`${API_BASE_URL}/api/invitations`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-session-id': sessionId || '',
                    },
                    body: JSON.stringify({
                      taskId: invitingTaskId,
                      inviteeEmail: inviteEmail,
                      message: inviteMessage,
                    }),
                  });

                  if (response.ok) {
                    alert('Invitation sent successfully!');
                    setIsInvitingUser(false);
                    setInviteEmail('');
                    setInviteMessage('');
                    setInvitingTaskId(null);
                  } else {
                    const data = await response.json();
                    alert(data.error || 'Failed to send invitation');
                  }
                } catch (error) {
                  console.error('Failed to send invitation:', error);
                  alert('Failed to send invitation');
                }
              }}
            >
              <div className="form-group">
                <label>User Email *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="Enter user's email address"
                  list="user-emails"
                />
                <datalist id="user-emails">
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name} {u.surname} {u.departmentId ? `(${u.departmentId})` : ''}
                    </option>
                  ))}
                </datalist>
                <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  User must be registered in the system
                </small>
              </div>
              <div className="form-group">
                <label>Message (Optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a message to the invitation..."
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setIsInvitingUser(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTimelineEnhanced;
