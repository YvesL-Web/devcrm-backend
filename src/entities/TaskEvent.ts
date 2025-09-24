import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Task } from './Task.js'
import { User } from './User.js'

export type TaskEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'COMMENT_ADDED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'

@Entity()
@Index(['orgId', 'taskId', 'createdAt'])
export class TaskEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  orgId!: string

  @Column('uuid')
  taskId!: string

  @ManyToOne(() => Task, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null

  @ManyToOne(() => User, () => undefined, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor?: User | null

  @Column({
    type: 'enum',
    enum: [
      'TASK_CREATED',
      'TASK_UPDATED',
      'STATUS_CHANGED',
      'ASSIGNEE_CHANGED',
      'COMMENT_ADDED',
      'ATTACHMENT_ADDED',
      'ATTACHMENT_REMOVED'
    ],
    default: 'TASK_CREATED'
  })
  type!:
    | 'TASK_CREATED'
    | 'TASK_UPDATED'
    | 'STATUS_CHANGED'
    | 'ASSIGNEE_CHANGED'
    | 'COMMENT_ADDED'
    | 'ATTACHMENT_ADDED'
    | 'ATTACHMENT_REMOVED'

  @Column({ type: 'jsonb', nullable: true })
  data!: any | null

  @CreateDateColumn()
  createdAt!: Date
}
