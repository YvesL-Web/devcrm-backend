import { AppDataSource } from '../config/data-source'
import { Task } from '../entities'
import { AppError } from '../utils/errors'

export async function loadTaskInOrg(taskId: string, orgId: string) {
  const task = await AppDataSource.getRepository(Task).findOne({
    where: {
      id: taskId,
      orgId
    }
  })
  if (!task) throw AppError.notFound('Task not found')
  return task
}
