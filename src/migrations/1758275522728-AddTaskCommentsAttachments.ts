import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskCommentsAttachments1758275522728 implements MigrationInterface {
    name = 'AddTaskCommentsAttachments1758275522728'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comment" DROP CONSTRAINT "FK_21d794ee0fd13efe62a04bc2a4c"`);
        await queryRunner.query(`CREATE TABLE "task_attachment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "taskId" uuid NOT NULL, "uploaderId" uuid NOT NULL, "filename" character varying(300) NOT NULL, "mimeType" character varying(150) NOT NULL, "size" bigint NOT NULL, "storageKey" character varying(500) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b9dd4c7184d6c02636decffa219" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ffc6e9acb9f28df266bee069ec" ON "task_attachment" ("taskId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "task_comment" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "task_comment" ADD "editedAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_e24c8295492e756188cc913f35" ON "task_comment" ("taskId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "task_attachment" ADD CONSTRAINT "FK_af192cfe21f9fde89a37adb7700" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_attachment" ADD CONSTRAINT "FK_9705a84561848128a318f67f545" FOREIGN KEY ("uploaderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_attachment" DROP CONSTRAINT "FK_9705a84561848128a318f67f545"`);
        await queryRunner.query(`ALTER TABLE "task_attachment" DROP CONSTRAINT "FK_af192cfe21f9fde89a37adb7700"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e24c8295492e756188cc913f35"`);
        await queryRunner.query(`ALTER TABLE "task_comment" DROP COLUMN "editedAt"`);
        await queryRunner.query(`ALTER TABLE "task_comment" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ffc6e9acb9f28df266bee069ec"`);
        await queryRunner.query(`DROP TABLE "task_attachment"`);
        await queryRunner.query(`ALTER TABLE "task_comment" ADD CONSTRAINT "FK_21d794ee0fd13efe62a04bc2a4c" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
