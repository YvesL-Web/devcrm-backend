import { MigrationInterface, QueryRunner } from 'typeorm'

export class OrgStripeColumns1700000000000 implements MigrationInterface {
  name = 'OrgStripeColumns1700000000000'

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "organization" ADD COLUMN "stripeCustomerId" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "stripeSubscriptionId" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "planStatus" varchar`)
    await q.query(`ALTER TABLE "organization" ADD COLUMN "planRenewsAt" timestamptz`)
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "organization" DROP COLUMN "planRenewsAt"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "planStatus"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "stripeSubscriptionId"`)
    await q.query(`ALTER TABLE "organization" DROP COLUMN "stripeCustomerId"`)
  }
}
