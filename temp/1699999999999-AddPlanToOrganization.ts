import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlanToOrganization1699999999999 implements MigrationInterface {
  name = 'AddPlanToOrganization1699999999999'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization" ADD COLUMN "plan" varchar NOT NULL DEFAULT 'FREE'`
    )
    // Optionnel: contrainte de validation
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "CHK_org_plan" CHECK (plan IN ('FREE','PRO','TEAM'))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organization" DROP CONSTRAINT IF EXISTS "CHK_org_plan"`)
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "plan"`)
  }
}
