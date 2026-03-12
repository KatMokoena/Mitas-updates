import { getDataSource } from '../database/config';
import { TimeEntryEntity, TimeEntryType, TimeEntryStatus } from '../database/entities/TimeEntry';
import { ProjectEntity } from '../database/entities/Project';
import { TaskEntity } from '../database/entities/Task';
import { UserEntity } from '../database/entities/User';
import { DepartmentEntity } from '../database/entities/Department';
import { In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export interface TimeEntrySummary {
  totalHours: number;
  totalEntries: number;
  byUser: Array<{
    userId: string;
    userName: string;
    totalHours: number;
    entryCount: number;
  }>;
  byTask: Array<{
    taskId: string;
    taskTitle: string;
    totalHours: number;
    entryCount: number;
  }>;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    totalHours: number;
    entryCount: number;
  }>;
  entries: Array<{
    id: string;
    userId: string;
    userName: string;
    taskId?: string;
    taskTitle?: string;
    entryType: TimeEntryType;
    startTime: Date;
    endTime?: Date;
    durationHours: number;
    description?: string;
    notes?: string;
  }>;
}

export class TimeTrackingService {
  /**
   * Start a timer for a user on a project/task
   */
  async startTimer(
    userId: string,
    projectId: string,
    taskId?: string,
    orderId?: string,
    description?: string
  ): Promise<TimeEntryEntity> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);
    const userRepository = dataSource.getRepository(UserEntity);

    // Check if user already has a running timer
    const runningTimer = await timeEntryRepository.findOne({
      where: {
        userId,
        status: TimeEntryStatus.RUNNING,
      },
    });

    if (runningTimer) {
      throw new Error('You already have a timer running. Please stop it first.');
    }

    // Verify project exists
    const projectRepository = dataSource.getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    // Verify task exists if provided
    if (taskId) {
      const taskRepository = dataSource.getRepository(TaskEntity);
      const task = await taskRepository.findOne({ where: { id: taskId } });
      if (!task) {
        throw new Error('Task not found');
      }
    }

    // Get user for departmentId
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const startTime = new Date();
    const timeEntry = timeEntryRepository.create({
      projectId,
      taskId,
      orderId,
      userId,
      userName: user.name || undefined,
      userSurname: user.surname || undefined,
      userEmail: user.email || undefined,
      entryType: TimeEntryType.TIMER,
      status: TimeEntryStatus.RUNNING,
      startTime,
      endTime: undefined,
      durationHours: 0, // Will be calculated when stopped
      description,
      departmentId: user.departmentId,
    });
    timeEntry.id = uuidv4();
    return await timeEntryRepository.save(timeEntry);
  }

  /**
   * Stop a running timer
   */
  async stopTimer(userId: string, timeEntryId?: string): Promise<TimeEntryEntity> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);

    let timeEntry: TimeEntryEntity | null;

    if (timeEntryId) {
      timeEntry = await timeEntryRepository.findOne({
        where: { id: timeEntryId, userId, status: TimeEntryStatus.RUNNING },
      });
    } else {
      // Find the user's running timer
      timeEntry = await timeEntryRepository.findOne({
        where: { userId, status: TimeEntryStatus.RUNNING },
      });
    }

    if (!timeEntry) {
      throw new Error('No running timer found');
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - timeEntry.startTime.getTime();
    const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

    timeEntry.endTime = endTime;
    timeEntry.durationHours = durationHours;
    timeEntry.status = TimeEntryStatus.COMPLETED;

    return await timeEntryRepository.save(timeEntry);
  }

  /**
   * Create a manual time entry
   */
  async createManualEntry(
    userId: string,
    projectId: string,
    startTime: Date,
    durationHours: number,
    taskId?: string,
    orderId?: string,
    description?: string,
    notes?: string
  ): Promise<TimeEntryEntity> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);
    const userRepository = dataSource.getRepository(UserEntity);

    // Verify project exists
    const projectRepository = dataSource.getRepository(ProjectEntity);
    const project = await projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    // Verify task exists if provided
    if (taskId) {
      const taskRepository = dataSource.getRepository(TaskEntity);
      const task = await taskRepository.findOne({ where: { id: taskId } });
      if (!task) {
        throw new Error('Task not found');
      }
    }

    // Get user for departmentId
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate end time from start time and duration
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    const timeEntry = timeEntryRepository.create({
      projectId,
      taskId,
      orderId,
      userId,
      userName: user.name || undefined,
      userSurname: user.surname || undefined,
      userEmail: user.email || undefined,
      entryType: TimeEntryType.MANUAL,
      status: TimeEntryStatus.COMPLETED,
      startTime,
      endTime,
      durationHours,
      description,
      notes,
      departmentId: user.departmentId,
    });
    timeEntry.id = uuidv4();
    return await timeEntryRepository.save(timeEntry);
  }

  /**
   * Get running timer for a user
   */
  async getRunningTimer(userId: string): Promise<TimeEntryEntity | null> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);

    return await timeEntryRepository.findOne({
      where: { userId, status: TimeEntryStatus.RUNNING },
      order: { startTime: 'DESC' },
    });
  }

  /**
   * Get time entries for a project with summary
   */
  async getProjectTimeSummary(projectId: string): Promise<TimeEntrySummary> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);
    const userRepository = dataSource.getRepository(UserEntity);
    const taskRepository = dataSource.getRepository(TaskEntity);
    const departmentRepository = dataSource.getRepository(DepartmentEntity);

    // Get all time entries for the project
    const entries = await timeEntryRepository.find({
      where: { projectId },
      order: { startTime: 'DESC' },
    });

    // Calculate totals
    let totalHours = 0;
    const userHours = new Map<string, { hours: number; count: number }>();
    const taskHours = new Map<string, { hours: number; count: number }>();
    const departmentHours = new Map<string, { hours: number; count: number }>();

    // Get user and task details
    const userIds = [...new Set(entries.map(e => e.userId))];
    const users = userIds.length > 0 
      ? await userRepository.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const taskIds = entries.map(e => e.taskId).filter((id): id is string => id !== undefined);
    const tasks = taskIds.length > 0 
      ? await taskRepository.find({ where: { id: In(taskIds) } })
      : [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const departmentIds = [...new Set(entries.map(e => e.departmentId).filter((id): id is string => id !== undefined))];
    const departments = departmentIds.length > 0
      ? await departmentRepository.find({ where: { id: In(departmentIds) } })
      : [];
    const departmentMap = new Map(departments.map(d => [d.id, d]));

    // Aggregate data
    for (const entry of entries) {
      totalHours += entry.durationHours;

      // By user
      const userHoursData = userHours.get(entry.userId) || { hours: 0, count: 0 };
      userHoursData.hours += entry.durationHours;
      userHoursData.count += 1;
      userHours.set(entry.userId, userHoursData);

      // By task
      if (entry.taskId) {
        const taskHoursData = taskHours.get(entry.taskId) || { hours: 0, count: 0 };
        taskHoursData.hours += entry.durationHours;
        taskHoursData.count += 1;
        taskHours.set(entry.taskId, taskHoursData);
      }

      // By department
      if (entry.departmentId) {
        const deptHoursData = departmentHours.get(entry.departmentId) || { hours: 0, count: 0 };
        deptHoursData.hours += entry.durationHours;
        deptHoursData.count += 1;
        departmentHours.set(entry.departmentId, deptHoursData);
      }
    }

    // Build summary
    const summary: TimeEntrySummary = {
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalEntries: entries.length,
      byUser: Array.from(userHours.entries()).map(([userId, data]) => {
        const user = userMap.get(userId);
        return {
          userId,
          userName: user ? `${user.name || ''} ${user.surname || ''}`.trim() || user.email : 'Unknown',
          totalHours: parseFloat(data.hours.toFixed(2)),
          entryCount: data.count,
        };
      }),
      byTask: Array.from(taskHours.entries()).map(([taskId, data]) => {
        const task = taskMap.get(taskId);
        return {
          taskId,
          taskTitle: task?.title || 'Unknown Task',
          totalHours: parseFloat(data.hours.toFixed(2)),
          entryCount: data.count,
        };
      }),
      byDepartment: Array.from(departmentHours.entries()).map(([departmentId, data]) => {
        const department = departmentMap.get(departmentId);
        return {
          departmentId,
          departmentName: department?.name || 'Unknown Department',
          totalHours: parseFloat(data.hours.toFixed(2)),
          entryCount: data.count,
        };
      }),
      entries: entries.map(entry => {
        const user = userMap.get(entry.userId);
        const task = entry.taskId ? taskMap.get(entry.taskId) : undefined;
        return {
          id: entry.id,
          userId: entry.userId,
          userName: user ? `${user.name || ''} ${user.surname || ''}`.trim() || user.email : 'Unknown',
          taskId: entry.taskId,
          taskTitle: task?.title,
          entryType: entry.entryType,
          startTime: entry.startTime,
          endTime: entry.endTime,
          durationHours: entry.durationHours,
          description: entry.description,
          notes: entry.notes,
        };
      }),
    };

    return summary;
  }

  /**
   * Get time entries for a user
   */
  async getUserTimeEntries(userId: string, projectId?: string): Promise<TimeEntryEntity[]> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);

    const where: any = { userId };
    if (projectId) {
      where.projectId = projectId;
    }

    return await timeEntryRepository.find({
      where,
      order: { startTime: 'DESC' },
    });
  }

  /**
   * Update a time entry
   */
  async updateTimeEntry(
    timeEntryId: string,
    userId: string,
    updates: {
      durationHours?: number;
      description?: string;
      notes?: string;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<TimeEntryEntity> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);

    const timeEntry = await timeEntryRepository.findOne({
      where: { id: timeEntryId, userId },
    });

    if (!timeEntry) {
      throw new Error('Time entry not found or you do not have permission to edit it');
    }

    // Don't allow editing running timers
    if (timeEntry.status === TimeEntryStatus.RUNNING) {
      throw new Error('Cannot edit a running timer. Stop it first.');
    }

    if (updates.durationHours !== undefined) {
      timeEntry.durationHours = updates.durationHours;
      if (updates.startTime) {
        timeEntry.startTime = updates.startTime;
        timeEntry.endTime = new Date(updates.startTime.getTime() + updates.durationHours * 60 * 60 * 1000);
      } else if (updates.endTime) {
        timeEntry.endTime = updates.endTime;
      } else if (timeEntry.startTime) {
        timeEntry.endTime = new Date(timeEntry.startTime.getTime() + updates.durationHours * 60 * 60 * 1000);
      }
    }

    if (updates.description !== undefined) {
      timeEntry.description = updates.description;
    }

    if (updates.notes !== undefined) {
      timeEntry.notes = updates.notes;
    }

    if (updates.startTime !== undefined) {
      timeEntry.startTime = updates.startTime;
      if (timeEntry.durationHours && !updates.endTime) {
        timeEntry.endTime = new Date(updates.startTime.getTime() + timeEntry.durationHours * 60 * 60 * 1000);
      }
    }

    if (updates.endTime !== undefined) {
      timeEntry.endTime = updates.endTime;
      if (timeEntry.startTime && !updates.durationHours) {
        const durationMs = updates.endTime.getTime() - timeEntry.startTime.getTime();
        timeEntry.durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
      }
    }

    return await timeEntryRepository.save(timeEntry);
  }

  /**
   * Delete a time entry
   */
  async deleteTimeEntry(timeEntryId: string, userId: string): Promise<void> {
    const dataSource = getDataSource();
    const timeEntryRepository = dataSource.getRepository(TimeEntryEntity);

    const timeEntry = await timeEntryRepository.findOne({
      where: { id: timeEntryId, userId },
    });

    if (!timeEntry) {
      throw new Error('Time entry not found or you do not have permission to delete it');
    }

    // Don't allow deleting running timers
    if (timeEntry.status === TimeEntryStatus.RUNNING) {
      throw new Error('Cannot delete a running timer. Stop it first.');
    }

    await timeEntryRepository.delete(timeEntryId);
  }
}

