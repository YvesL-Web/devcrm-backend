import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
// ❌ remove: imports OrgMember/TimeEntry

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', unique: true })
  email!: string

  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  passwordHash!: string

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null

  @CreateDateColumn()
  createdAt!: Date
}
