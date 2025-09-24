import { MigrationInterface, QueryRunner } from 'typeorm'

export class InvoiceTotals1700000002001 implements MigrationInterface {
  name = 'InvoiceTotals1700000002001'

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "invoice" ADD COLUMN "subtotal" integer NOT NULL DEFAULT 0`)
    await q.query(`ALTER TABLE "invoice" ADD COLUMN "discountCents" integer NOT NULL DEFAULT 0`)
    await q.query(`ALTER TABLE "invoice" ADD COLUMN "taxPercent" integer NOT NULL DEFAULT 0`)
    await q.query(`ALTER TABLE "invoice" ADD COLUMN "taxAmount" integer NOT NULL DEFAULT 0`)
    await q.query(`ALTER TABLE "invoice" ADD COLUMN "notes" text`)
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "invoice" DROP COLUMN "notes"`)
    await q.query(`ALTER TABLE "invoice" DROP COLUMN "taxAmount"`)
    await q.query(`ALTER TABLE "invoice" DROP COLUMN "taxPercent"`)
    await q.query(`ALTER TABLE "invoice" DROP COLUMN "discountCents"`)
    await q.query(`ALTER TABLE "invoice" DROP COLUMN "subtotal"`)
  }
}
