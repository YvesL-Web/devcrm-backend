import { MigrationInterface, QueryRunner } from 'typeorm'

export class UserAuthFields1700000004000 implements MigrationInterface {
  name = 'UserAuthFields1700000004000'
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "user" ADD COLUMN "emailVerifiedAt" timestamptz`)
    await q.query(`ALTER TABLE "user" ADD COLUMN "lastLoginAt" timestamptz`)
    // await q.query(`ALTER TABLE "user" ADD COLUMN "emailLower" varchar`);
    // await q.query(`UPDATE "user" SET "emailLower" = LOWER(email)`);
    // await q.query(`ALTER TABLE "user" ALTER COLUMN "emailLower" SET NOT NULL`);
    await q.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "tokenVersion"`)
    await q.query(`CREATE UNIQUE INDEX "UQ_user_email" ON "user" ("email")`)
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "UQ_user_email"`)
    // await q.query(`ALTER TABLE "user" DROP COLUMN "emailLower"`);
    await q.query(`ALTER TABLE "user" DROP COLUMN "lastLoginAt"`)
    await q.query(`ALTER TABLE "user" DROP COLUMN "emailVerifiedAt"`)
  }
}
