import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { Client } from './Client.js'
import { Organization } from './Organization.js'
import { Project } from './Project.js'

@Entity()
@Index(['orgId', 'number'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  orgId!: string
  @ManyToOne(() => Organization, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org!: Organization

  @Column({ type: 'uuid', nullable: true })
  projectId!: string | null
  @ManyToOne(() => Project, () => undefined, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectId' })
  project?: Project | null

  @Column({ type: 'uuid', nullable: true })
  clientId!: string | null
  @ManyToOne(() => Client, () => undefined, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clientId' })
  client?: Client | null

  @Column({ type: 'varchar', length: 40 })
  number!: string // ex: INV-2025-0001

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string

  @Column({ type: 'date' })
  issueDate!: string // 'YYYY-MM-DD'

  @Column({ type: 'date', nullable: true })
  dueDate!: string | null

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELED'],
    default: 'DRAFT'
  })
  status!: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELED'

  @OneToMany(() => InvoiceItem, (it) => it.invoice, { cascade: true })
  items!: InvoiceItem[]

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  tax!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total!: string

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'text', nullable: true })
  terms!: string | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

@Entity()
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  invoiceId!: string

  @ManyToOne(() => Invoice, (inv) => inv.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: Invoice

  @Column({ type: 'varchar', length: 500 })
  description!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  quantity!: string // stocké en NUMERIC

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitPrice!: string // stocké en NUMERIC

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount!: string // quantity * unitPrice

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
