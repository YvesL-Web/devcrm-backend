import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskCommentMention1758359603609 implements MigrationInterface {
    name = 'AddTaskCommentMention1758359603609'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP CONSTRAINT "FK_2e8a3bced2fab16eab902a2991f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce1c49fd1ed1ae900a7f90d048"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD "taskId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD "mentionedUserId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD "notifiedAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_928d001c89c6d892973a7a4aca" ON "task_comment_mention" ("orgId", "taskId") `);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD CONSTRAINT "FK_fc2d13759426dba39f662943a2b" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD CONSTRAINT "FK_bf34fe65030e26e19c795e1188a" FOREIGN KEY ("mentionedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP CONSTRAINT "FK_bf34fe65030e26e19c795e1188a"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP CONSTRAINT "FK_fc2d13759426dba39f662943a2b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_928d001c89c6d892973a7a4aca"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP COLUMN "notifiedAt"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP COLUMN "mentionedUserId"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" DROP COLUMN "taskId"`);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ce1c49fd1ed1ae900a7f90d048" ON "task_comment_mention" ("commentId", "userId") `);
        await queryRunner.query(`ALTER TABLE "task_comment_mention" ADD CONSTRAINT "FK_2e8a3bced2fab16eab902a2991f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
