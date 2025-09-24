import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskDoneAt1758295072742 implements MigrationInterface {
    name = 'AddTaskDoneAt1758295072742'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_comment_mention" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "commentId" uuid NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_60e2c96a058236195558d7cbd6d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ce1c49fd1ed1ae900a7f90d048" ON "task_comment_mention" ("commentId", "userId") `);
        await queryRunner.query(`ALTER TABLE "task" ADD "doneAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD CONSTRAINT "FK_47405cb31e098b325a2548e3e46" FOREIGN KEY ("commentId") REFERENCES "task_comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD CONSTRAINT "FK_2e8a3bced2fab16eab902a2991f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP CONSTRAINT "FK_2e8a3bced2fab16eab902a2991f"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP CONSTRAINT "FK_47405cb31e098b325a2548e3e46"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "doneAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce1c49fd1ed1ae900a7f90d048"`);
        await queryRunner.query(`DROP TABLE "task_comment_mention"`);
    }

}
