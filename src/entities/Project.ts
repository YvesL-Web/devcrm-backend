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
import { Client } from './Client.js'
import { Organization } from './Organization.js'

@Entity()
@Index(['orgId', 'name'])
@Index(['orgId', 'status'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  orgId!: string

  @ManyToOne(() => Organization, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org!: Organization

  @Column({ type: 'uuid', nullable: true })
  clientId?: string | null

  @ManyToOne(() => Client, () => undefined, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clientId' })
  client?: Client

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar', unique: true })
  portalSlug!: string

  @Column({ type: 'enum', enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' })
  status!: 'ACTIVE' | 'ARCHIVED'

  @Column({ type: 'boolean', default: true })
  portalPublic!: boolean

  @Column({ type: 'boolean', default: true })
  portalShowChangelog!: boolean

  @Column({ type: 'boolean', default: true })
  portalShowInvoices!: boolean

  @Column({ type: 'text', nullable: true })
  portalWelcome?: string | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
