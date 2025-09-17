import { MigrationInterface, QueryRunner } from 'typeorm'

export class ProjectPortal1700000003000 implements MigrationInterface {
  name = 'ProjectPortal1700000003000'

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "project" ADD COLUMN "portalPublic" boolean NOT NULL DEFAULT true`)
    await q.query(
      `ALTER TABLE "project" ADD COLUMN "portalShowChangelog" boolean NOT NULL DEFAULT true`
    )
    await q.query(
      `ALTER TABLE "project" ADD COLUMN "portalShowInvoices" boolean NOT NULL DEFAULT true`
    )
    await q.query(`ALTER TABLE "project" ADD COLUMN "portalWelcome" text`)
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "project" DROP COLUMN "portalWelcome"`)
    await q.query(`ALTER TABLE "project" DROP COLUMN "portalShowInvoices"`)
    await q.query(`ALTER TABLE "project" DROP COLUMN "portalShowChangelog"`)
    await q.query(`ALTER TABLE "project" DROP COLUMN "portalPublic"`)
  }
}
