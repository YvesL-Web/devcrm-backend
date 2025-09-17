import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Project } from './Project.js'
import { User } from './User.js'
import { Organization } from './index.js'

@Entity()
@Index(['orgId', 'projectId', 'status', 'kanbanOrder'])
@Index(['orgId', 'priority'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  orgId!: string

  @ManyToOne(() => Organization, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org!: Organization

  @Column('uuid')
  projectId!: string

  @ManyToOne(() => Project, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project

  @Column('varchar')
  title!: string

  @Column({ type: 'text', nullable: true })
  description?: string | null

  @Column({ type: 'enum', enum: ['OPEN', 'IN_PROGRESS', 'DONE'], default: 'OPEN' })
  status!: 'OPEN' | 'IN_PROGRESS' | 'DONE'

  @Column({ type: 'enum', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' })
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

  @Column({ type: 'date', nullable: true })
  dueDate?: string | null // YYYY-MM-DD

  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string | null

  @ManyToOne(() => User, () => undefined, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User | null

  @Column({ type: 'varchar', nullable: true })
  githubIssueUrl?: string | null

  // simple-array -> "label1,label2" (rapide à mettre en place)
  @Column({ type: 'simple-array', nullable: true })
  labels?: string[] | null

  @Column({ type: 'int', default: 0 })
  kanbanOrder!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
