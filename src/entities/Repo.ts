import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from './Project.js'

@Entity()
export class Repo {
  @PrimaryGeneratedColumn('uuid') id!: string

  @Column('uuid')
  projectId!: string

  @ManyToOne(() => Project, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project

  @Column({ type: 'enum', enum: ['GITHUB', 'GITLAB'], default: 'GITHUB' })
  provider!: 'GITHUB' | 'GITLAB'

  @Column('varchar')
  externalId!: string

  @Column('varchar')
  name!: string
}
