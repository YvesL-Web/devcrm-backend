import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Organization } from './Organization.js'

@Entity()
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  orgId!: string

  @ManyToOne(() => Organization, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org!: Organization

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar', nullable: true })
  email?: string | null

  @Column({ type: 'varchar', nullable: true })
  company?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressLine1?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressLine2?: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  city?: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  state?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode?: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  country?: string | null

  @Column({ type: 'text', nullable: true })
  notes?: string | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
