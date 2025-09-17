import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1757938560406 implements MigrationInterface {
    name = 'Init1757938560406'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "locale"`);
        await queryRunner.query(`ALTER TABLE "client" ADD "phone" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "client" ADD "addressLine1" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "client" ADD "addressLine2" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "client" ADD "city" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "client" ADD "state" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "client" ADD "postalCode" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "client" ADD "country" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "client" ADD "notes" text`);
        await queryRunner.query(`ALTER TABLE "client" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "postalCode"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "addressLine2"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "addressLine1"`);
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "client" ADD "locale" character varying`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
