import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1757858271080 implements MigrationInterface {
    name = 'Init1757858271080'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_watcher" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "projectId" uuid NOT NULL, "taskId" uuid NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a1ec0e63a7b7d14084249fcf2f8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dec52062bc494eb8addae2788f" ON "task_watcher" ("taskId", "userId") `);
        await queryRunner.query(`CREATE TYPE "public"."org_invite_role_enum" AS ENUM('MEMBER', 'CLIENT_VIEWER')`);
        await queryRunner.query(`CREATE TABLE "org_invite" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "email" character varying NOT NULL, "role" "public"."org_invite_role_enum" NOT NULL DEFAULT 'MEMBER', "inviterId" uuid NOT NULL, "token" character varying NOT NULL, "acceptedAt" TIMESTAMP, "expiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e85cea7f4d8925abbe2498e93b1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8a9e9636bfb02bd420e7335608" ON "org_invite" ("email") `);
        await queryRunner.query(`ALTER TABLE "task" ADD "dueDate" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "dueDate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a9e9636bfb02bd420e7335608"`);
        await queryRunner.query(`DROP TABLE "org_invite"`);
        await queryRunner.query(`DROP TYPE "public"."org_invite_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dec52062bc494eb8addae2788f"`);
        await queryRunner.query(`DROP TABLE "task_watcher"`);
    }

}
