import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
@Index(['taskId', 'userId'], { unique: true })
export class TaskWatcher {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column('uuid') orgId!: string
  @Column('uuid') projectId!: string
  @Column('uuid') taskId!: string
  @Column('uuid') userId!: string
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date
}
