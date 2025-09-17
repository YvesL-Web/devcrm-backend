import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoices1758102294179 implements MigrationInterface {
    name = 'AddInvoices1758102294179'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "issuedAt"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "dueAt"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "discountCents"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "taxPercent"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "taxAmount"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "qty"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "projectId" uuid`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "issueDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "dueDate" date`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "tax" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "terms" text`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "quantity" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "amount" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "sortOrder" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_f18e9b95fe80b1f554d1cb6c23b"`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "clientId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "UQ_60284980bc8b9c624459948f4ac"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "number"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "number" character varying(40) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "currency" character varying(3) NOT NULL DEFAULT 'USD'`);
        await queryRunner.query(`ALTER TYPE "public"."invoice_status_enum" RENAME TO "invoice_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."invoice_status_enum" AS ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELED')`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "status" TYPE "public"."invoice_status_enum" USING "status"::"text"::"public"."invoice_status_enum"`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."invoice_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "subtotal"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "subtotal" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "total"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "total" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "description" character varying(500) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "unitPrice"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "unitPrice" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6dbc3d408944a6bd604726def9" ON "invoice" ("orgId", "number") `);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_eca8013d9719930683f74ae7e10" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_f18e9b95fe80b1f554d1cb6c23b" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_f18e9b95fe80b1f554d1cb6c23b"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_eca8013d9719930683f74ae7e10"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6dbc3d408944a6bd604726def9"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "unitPrice"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "unitPrice" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "description" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "total"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "total" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "subtotal"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "subtotal" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE TYPE "public"."invoice_status_enum_old" AS ENUM('DRAFT', 'SENT', 'PAID')`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "status" TYPE "public"."invoice_status_enum_old" USING "status"::"text"::"public"."invoice_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."invoice_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."invoice_status_enum_old" RENAME TO "invoice_status_enum"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "currency" character varying NOT NULL DEFAULT 'EUR'`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "number"`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "number" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "UQ_60284980bc8b9c624459948f4ac" UNIQUE ("number")`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "clientId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_f18e9b95fe80b1f554d1cb6c23b" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "sortOrder"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "terms"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "tax"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "dueDate"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "issueDate"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "projectId"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD "qty" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "taxAmount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "taxPercent" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "discountCents" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "dueAt" date`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "issuedAt" date`);
    }

}
