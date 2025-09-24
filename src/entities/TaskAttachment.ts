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

@Entity()
@Index(['taskId', 'createdAt'])
export class TaskAttachment {
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
  uploaderId!: string

  @ManyToOne(() => User, () => undefined, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaderId' })
  uploader?: User | null

  @Column({ type: 'varchar', length: 300 })
  filename!: string

  @Column({ type: 'varchar', length: 150 })
  mimeType!: string

  @Column({ type: 'bigint' })
  size!: string

  @Column({ type: 'varchar', length: 500 })
  storageKey!: string

  @CreateDateColumn()
  createdAt!: Date
}
