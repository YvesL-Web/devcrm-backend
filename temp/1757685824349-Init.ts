import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1757685824349 implements MigrationInterface {
    name = 'Init1757685824349'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_7384988f7eeb777e44802a0baca"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_user_email"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP CONSTRAINT "CHK_org_plan"`);
        await queryRunner.query(`ALTER TABLE "project" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "task" ADD "orgId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD "description" text`);
        await queryRunner.query(`CREATE TYPE "public"."task_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`);
        await queryRunner.query(`ALTER TABLE "task" ADD "priority" "public"."task_priority_enum" NOT NULL DEFAULT 'MEDIUM'`);
        await queryRunner.query(`ALTER TABLE "task" ADD "labels" text`);
        await queryRunner.query(`ALTER TABLE "task" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "task" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "plan"`);
        await queryRunner.query(`CREATE TYPE "public"."organization_plan_enum" AS ENUM('FREE', 'PRO', 'TEAM')`);
        await queryRunner.query(`ALTER TABLE "organization" ADD "plan" "public"."organization_plan_enum" NOT NULL DEFAULT 'FREE'`);
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "planStatus"`);
        await queryRunner.query(`CREATE TYPE "public"."organization_planstatus_enum" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')`);
        await queryRunner.query(`ALTER TABLE "organization" ADD "planStatus" "public"."organization_planstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "time_entry" DROP COLUMN "kind"`);
        await queryRunner.query(`CREATE TYPE "public"."time_entry_kind_enum" AS ENUM('DEV', 'CONSULT')`);
        await queryRunner.query(`ALTER TABLE "time_entry" ADD "kind" "public"."time_entry_kind_enum" NOT NULL DEFAULT 'DEV'`);
        await queryRunner.query(`CREATE INDEX "IDX_8a2511f3bcdf3dde52a9151a6c" ON "project" ("orgId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_9cc54d4372210de16bcf952261" ON "project" ("orgId", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_c113ce2df742c636b45d2d5875" ON "task" ("orgId", "priority") `);
        await queryRunner.query(`CREATE INDEX "IDX_372d74c4eaa1816d9e6f54d76a" ON "task" ("orgId", "projectId", "status") `);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_6e3da4daad6f2d85dead6ce9c1d" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_7384988f7eeb777e44802a0baca" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_7384988f7eeb777e44802a0baca"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_6e3da4daad6f2d85dead6ce9c1d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_372d74c4eaa1816d9e6f54d76a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c113ce2df742c636b45d2d5875"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9cc54d4372210de16bcf952261"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a2511f3bcdf3dde52a9151a6c"`);
        await queryRunner.query(`ALTER TABLE "time_entry" DROP COLUMN "kind"`);
        await queryRunner.query(`DROP TYPE "public"."time_entry_kind_enum"`);
        await queryRunner.query(`ALTER TABLE "time_entry" ADD "kind" character varying NOT NULL DEFAULT 'DEV'`);
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "planStatus"`);
        await queryRunner.query(`DROP TYPE "public"."organization_planstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "organization" ADD "planStatus" character varying`);
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "plan"`);
        await queryRunner.query(`DROP TYPE "public"."organization_plan_enum"`);
        await queryRunner.query(`ALTER TABLE "organization" ADD "plan" character varying NOT NULL DEFAULT 'FREE'`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "labels"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "priority"`);
        await queryRunner.query(`DROP TYPE "public"."task_priority_enum"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "orgId"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "organization" ADD CONSTRAINT "CHK_org_plan" CHECK (((plan)::text = ANY ((ARRAY['FREE'::character varying, 'PRO'::character varying, 'TEAM'::character varying])::text[])))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_user_email" ON "user" ("email") `);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_7384988f7eeb777e44802a0baca" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
