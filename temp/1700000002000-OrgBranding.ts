import { MigrationInterface, QueryRunner } from 'typeorm'

export class OrgBranding1700000002000 implements MigrationInterface {
  name = 'OrgBranding1700000002000'

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "organization" ADD COLUMN "defaultCurrency" varchar NOT NULL DEFAULT 'EUR'`
    )
    await q.query(`ALTER TABLE "organization" ADD COLUMN "locale" varchar NOT NULL DEFAULT 'en'`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "logoUrl" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "addressLine1" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "addressLine2" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "city" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "postalCode" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "country" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "taxId" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "vatNumber" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "invoiceFooter" text`)
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "organization" DROP COLUMN "invoiceFooter"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "vatNumber"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "taxId"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "country"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "postalCode"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "city"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "addressLine2"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "addressLine1"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "logoUrl"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "locale"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "defaultCurrency"`)
  }
}
