import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Release } from './Release.js'

@Entity()
export class ChangelogItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  releaseId!: string

  @ManyToOne(() => Release, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'releaseId' })
  release!: Release

  @Column({ type: 'enum', enum: ['FEATURE', 'FIX', 'CHORE'] })
  type!: 'FEATURE' | 'FIX' | 'CHORE'

  @Column({ type: 'varchar' })
  title!: string

  @Column({ type: 'varchar', nullable: true })
  url?: string | null
}
