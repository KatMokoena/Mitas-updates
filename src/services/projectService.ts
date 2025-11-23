import { getDataSource } from '../database/config';
import { ProjectEntity } from '../database/entities/Project';
import { TaskEntity } from '../database/entities/Task';
import { Project, Task } from '../shared/types';

export class ProjectService {
  async getAllProjects(): Promise<Project[]> {
    const repository = getDataSource().getRepository(ProjectEntity);
    return await repository.find();
  }

  async getProjectById(id: string): Promise<Project | null> {
    const repository = getDataSource().getRepository(ProjectEntity);
    return await repository.findOne({ where: { id } });
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const repository = getDataSource().getRepository(ProjectEntity);
    const project = repository.create(projectData);
    return await repository.save(project);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const repository = getDataSource().getRepository(ProjectEntity);
    const project = await repository.findOne({ where: { id } });
    if (!project) {
      throw new Error('Project not found');
    }
    Object.assign(project, updates);
    return await repository.save(project);
  }

  async deleteProject(id: string): Promise<void> {
    const repository = getDataSource().getRepository(ProjectEntity);
    const taskRepository = getDataSource().getRepository(TaskEntity);
    
    // Delete associated tasks
    await taskRepository.delete({ projectId: id });
    
    // Delete project
    await repository.delete(id);
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    const repository = getDataSource().getRepository(TaskEntity);
    return await repository.find({
      where: { projectId },
      order: { startDate: 'ASC' },
    });
  }

  async recalculateTimeline(projectId: string): Promise<void> {
    const taskRepository = getDataSource().getRepository(TaskEntity);
    const tasks = await taskRepository.find({
      where: { projectId },
      order: { startDate: 'ASC' },
    });

    // Simple dependency resolution - update dates based on dependencies
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();

    const updateTaskDates = (taskId: string): void => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return;

      // Process dependencies first
      for (const depId of task.dependencies) {
        updateTaskDates(depId);
      }

      // Calculate start date based on dependencies
      let latestEndDate = task.startDate;
      for (const depId of task.dependencies) {
        const depTask = taskMap.get(depId);
        if (depTask && depTask.endDate > latestEndDate) {
          latestEndDate = depTask.endDate;
        }
      }

      // Update task dates if needed
      if (latestEndDate > task.startDate) {
        const daysDiff = Math.ceil((latestEndDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
        task.startDate = new Date(latestEndDate);
        task.endDate = new Date(task.startDate);
        task.endDate.setDate(task.endDate.getDate() + task.estimatedDays);
        taskRepository.save(task);
      }
    };

    // Update all tasks
    for (const task of tasks) {
      updateTaskDates(task.id);
    }
  }
}

