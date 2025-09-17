import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column('uuid') orgId!: string
  @Column('varchar') keyHash!: string
  @CreateDateColumn() createdAt!: Date
  @Column({ type: 'timestamptz', nullable: true }) lastUsedAt?: Date
}
