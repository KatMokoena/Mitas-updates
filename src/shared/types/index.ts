export enum UserRole {
  USER = 'USER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ADMIN = 'ADMIN',
  EXECUTIVES = 'EXECUTIVES',
}

export enum OrderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
}

export enum ComponentType {
  LASER_MARKER = 'laser_marker',
  SCRIBE_MARKER = 'scribe_marker',
  INKJET_MACHINE = 'inkjet_machine',
  AUTOMATION = 'automation',
  CUSTOM_SOFTWARE = 'custom_software',
  VISION_SYSTEM = 'vision_system',
  QUALITY_CONTROL = 'quality_control',
  MATERIALS_HANDLING = 'materials_handling',
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  components: ComponentType[];
  assignedTeamIds: string[];
  ownerId?: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  orderId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  startDate: Date;
  endDate: Date;
  plannedStartDateTime?: Date;
  plannedEndDateTime?: Date;
  actualStartDateTime?: Date;
  actualEndDateTime?: Date;
  estimatedDays: number;
  actualDays?: number;
  assignedUserId?: string;
  resourceIds?: string[];
  purchaseIds?: string[];
  deliverableIds?: string[];
  dependencies: string[];
  isCritical: boolean;
  slackDays?: number;
  milestone: boolean;
  createdAt: Date;
  updatedAt: Date;
}
