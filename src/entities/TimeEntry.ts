import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Project } from './Project.js'
import { Task } from './Task.js'
import { User } from './User.js'

@Entity()
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  projectId!: string

  @ManyToOne(() => Project, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project

  @Column({ type: 'uuid', nullable: true })
  taskId?: string

  @ManyToOne(() => Task, () => undefined, { nullable: true })
  @JoinColumn({ name: 'taskId' })
  task?: Task

  @Column('uuid')
  userId!: string

  @ManyToOne(() => User, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User

  @Column({ type: 'timestamptz' })
  startedAt!: Date

  @Column({ type: 'timestamptz' })
  endedAt!: Date

  @Column({ type: 'enum', enum: ['DEV', 'CONSULT'], default: 'DEV' })
  kind!: 'DEV' | 'CONSULT'

  @CreateDateColumn()
  createdAt!: Date
}
