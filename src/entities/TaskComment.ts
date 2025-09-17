import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Organization } from './Organization.js'
import { Task } from './Task.js'
import { User } from './User.js'

@Entity()
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  orgId!: string

  @ManyToOne(() => Organization, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org!: Organization

  @Column('uuid')
  taskId!: string

  @ManyToOne(() => Task, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task

  @Column('uuid')
  authorId!: string

  @ManyToOne(() => User, () => undefined, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author!: User

  @Column({ type: 'text' })
  body!: string

  @CreateDateColumn()
  createdAt!: Date
}
