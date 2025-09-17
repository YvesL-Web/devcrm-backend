import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Project } from './Project.js'

@Entity()
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  projectId!: string

  @ManyToOne(() => Project, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project

  @Column({ type: 'varchar', nullable: true })
  version?: string // e.g. 1.2.0

  @Column('varchar')
  title!: string

  @Column({ type: 'text' })
  bodyMd!: string

  @CreateDateColumn()
  createdAt!: Date
}
