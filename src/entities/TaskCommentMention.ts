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
import { TaskComment } from './TaskComment.js'
import { User } from './User.js'

@Entity()
@Index(['orgId', 'taskId'])
export class TaskCommentMention {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  orgId!: string

  @Column('uuid')
  taskId!: string

  @ManyToOne(() => Task, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task

  @Column('uuid')
  commentId!: string

  @ManyToOne(() => TaskComment, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment!: TaskComment

  @Column('uuid')
  mentionedUserId!: string

  @ManyToOne(() => User, () => undefined, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mentionedUserId' })
  mentionedUser?: User | null

  @CreateDateColumn()
  createdAt!: Date

  @Column({ type: 'timestamp', nullable: true })
  notifiedAt!: Date | null
}
