import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1757762761518 implements MigrationInterface {
    name = 'Init1757762761518'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_372d74c4eaa1816d9e6f54d76a"`);
        await queryRunner.query(`CREATE TABLE "task_comment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "taskId" uuid NOT NULL, "authorId" uuid NOT NULL, "body" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_28da4411b195bfc3c451cfa21ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "task" ADD "kanbanOrder" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE INDEX "IDX_a49abf2f1e91589bd6c9f9a38a" ON "task" ("orgId", "projectId", "status", "kanbanOrder") `);
        await queryRunner.query(`ALTER TABLE "task_comment" ADD CONSTRAINT "FK_21d794ee0fd13efe62a04bc2a4c" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment" ADD CONSTRAINT "FK_0fed042ede2365de8b32e105cc6" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comment" ADD CONSTRAINT "FK_e0e20a1abae5cee7a04a578e0d6" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comment" DROP CONSTRAINT "FK_e0e20a1abae5cee7a04a578e0d6"`);
        await queryRunner.query(`ALTER TABLE "task_comment" DROP CONSTRAINT "FK_0fed042ede2365de8b32e105cc6"`);
        await queryRunner.query(`ALTER TABLE "task_comment" DROP CONSTRAINT "FK_21d794ee0fd13efe62a04bc2a4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a49abf2f1e91589bd6c9f9a38a"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "kanbanOrder"`);
        await queryRunner.query(`DROP TABLE "task_comment"`);
        await queryRunner.query(`CREATE INDEX "IDX_372d74c4eaa1816d9e6f54d76a" ON "task" ("orgId", "projectId", "status") `);
    }

}
