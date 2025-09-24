import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskEvent1758366677325 implements MigrationInterface {
    name = 'AddTaskEvent1758366677325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."task_event_type_enum" AS ENUM('TASK_CREATED', 'TASK_UPDATED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'COMMENT_ADDED', 'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED')`);
        await queryRunner.query(`CREATE TABLE "task_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "taskId" uuid NOT NULL, "actorId" uuid, "type" "public"."task_event_type_enum" NOT NULL DEFAULT 'TASK_CREATED', "data" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5512953f207de074aea7e6b1515" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d17796baeee1d128f9a2f2a246" ON "task_event" ("orgId", "taskId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "task_event" ADD CONSTRAINT "FK_aac7a677233eb7637f194788031" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_event" ADD CONSTRAINT "FK_083207f659089984e0c65aa9213" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_event" DROP CONSTRAINT "FK_083207f659089984e0c65aa9213"`);
        await queryRunner.query(`ALTER TABLE "task_event" DROP CONSTRAINT "FK_aac7a677233eb7637f194788031"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d17796baeee1d128f9a2f2a246"`);
        await queryRunner.query(`DROP TABLE "task_event"`);
        await queryRunner.query(`DROP TYPE "public"."task_event_type_enum"`);
    }

}
