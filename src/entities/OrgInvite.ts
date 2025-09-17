import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class OrgInvite {
  @PrimaryGeneratedColumn('uuid') id!: string

  @Column('uuid') orgId!: string
  @Index() @Column('varchar') email!: string
  @Column({ type: 'enum', enum: ['MEMBER', 'CLIENT_VIEWER'], default: 'MEMBER' })
  role!: 'MEMBER' | 'CLIENT_VIEWER'

  @Column('uuid') inviterId!: string
  @Column('varchar') token!: string // signed random
  @Column({ type: 'timestamp', nullable: true }) acceptedAt?: Date | null
  @Column({ type: 'timestamp', nullable: true }) expiresAt?: Date | null

  @CreateDateColumn() createdAt!: Date
}
