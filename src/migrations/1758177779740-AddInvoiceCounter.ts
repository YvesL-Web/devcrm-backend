import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceCounter1758177779740 implements MigrationInterface {
    name = 'AddInvoiceCounter1758177779740'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoice_counter" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "year" integer NOT NULL, "lastNumber" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4824560608e11b81debf3e225c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4e2c80b357cb9218d87771b620" ON "invoice_counter" ("orgId", "year") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_4e2c80b357cb9218d87771b620"`);
        await queryRunner.query(`DROP TABLE "invoice_counter"`);
    }

}
