import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'
import { User } from './User.js'

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'uuid' })
  ownerId!: string

  @ManyToOne(() => User, () => undefined, { nullable: false })
  @JoinColumn({ name: 'ownerId' })
  owner!: User

  @Column({ type: 'enum', enum: ['FREE', 'PRO', 'TEAM'], default: 'FREE' })
  plan!: 'FREE' | 'PRO' | 'TEAM'

  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId?: string | null

  @Column({ type: 'varchar', nullable: true })
  stripeSubscriptionId?: string | null

  @Column({
    type: 'enum',
    enum: [
      'active',
      'trialing',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    ],
    nullable: true
  })
  planStatus?:
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'paused'
    | null

  @Column({ type: 'timestamptz', nullable: true })
  planRenewsAt?: Date | null

  @Column({ type: 'varchar', default: 'EUR' })
  defaultCurrency!: string

  @Column({ type: 'varchar', default: 'en' })
  locale!: string

  @Column({ type: 'varchar', nullable: true })
  logoUrl?: string | null

  @Column({ type: 'varchar', nullable: true })
  addressLine1?: string | null

  @Column({ type: 'varchar', nullable: true })
  addressLine2?: string | null

  @Column({ type: 'varchar', nullable: true })
  city?: string | null

  @Column({ type: 'varchar', nullable: true })
  postalCode?: string | null

  @Column({ type: 'varchar', nullable: true })
  country?: string | null

  @Column({ type: 'varchar', nullable: true })
  taxId?: string | null // SIREN/Company ID

  @Column({ type: 'varchar', nullable: true })
  vatNumber?: string | null // FRxx... / EU VAT

  @Column({ type: 'text', nullable: true })
  invoiceFooter?: string | null // terms & legal lines

  @CreateDateColumn()
  createdAt!: Date
}
