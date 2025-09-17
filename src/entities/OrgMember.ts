import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { Organization } from './Organization.js'
import { User } from './User.js'

export type Role = 'OWNER' | 'MEMBER' | 'CLIENT_VIEWER'

@Entity()
@Unique(['orgId', 'userId'])
export class OrgMember {
  @PrimaryGeneratedColumn('uuid') id!: string

  @Column({ type: 'uuid' })
  orgId!: string
  @ManyToOne(() => Organization, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org!: Organization

  @Column({ type: 'uuid' })
  userId!: string

  @ManyToOne(() => User, () => undefined, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User

  @Column({ type: 'varchar' }) role!: Role
}
