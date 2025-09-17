import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column('varchar') provider!: string
  @Column({ type: 'jsonb' }) payloadJson!: any
  @Column({ type: 'enum', enum: ['PENDING', 'PROCESSED', 'ERROR'], default: 'PENDING' }) status!:
    | 'PENDING'
    | 'PROCESSED'
    | 'ERROR'
  @CreateDateColumn() createdAt!: Date
  @Column({ type: 'timestamptz', nullable: true }) processedAt?: Date
}
