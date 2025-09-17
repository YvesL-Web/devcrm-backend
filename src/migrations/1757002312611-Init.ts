import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1757002312611 implements MigrationInterface {
    name = 'Init1757002312611'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."webhook_event_status_enum" AS ENUM('PENDING', 'PROCESSED', 'ERROR')`);
        await queryRunner.query(`CREATE TABLE "webhook_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying NOT NULL, "payloadJson" jsonb NOT NULL, "status" "public"."webhook_event_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "processedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0f56d2f40f5ec823acf8e8edad1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "passwordHash" character varying NOT NULL, "tokenVersion" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "organization" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "org_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "userId" uuid NOT NULL, "role" character varying NOT NULL, CONSTRAINT "UQ_4d21eb48396e3c7bf2ef37c062f" UNIQUE ("orgId", "userId"), CONSTRAINT "PK_572a1b79344c45cba61e93eb34c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "client" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "name" character varying NOT NULL, "email" character varying, "company" character varying, "locale" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_96da49381769303a6515a8785c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."project_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "project" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "clientId" uuid, "name" character varying NOT NULL, "portalSlug" character varying NOT NULL, "status" "public"."project_status_enum" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_de99aff558cb7aaee74c5864e5a" UNIQUE ("portalSlug"), CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invoice_status_enum" AS ENUM('DRAFT', 'SENT', 'PAID')`);
        await queryRunner.query(`CREATE TABLE "invoice" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "clientId" uuid NOT NULL, "number" character varying NOT NULL, "currency" character varying NOT NULL DEFAULT 'EUR', "status" "public"."invoice_status_enum" NOT NULL DEFAULT 'DRAFT', "issuedAt" date, "dueAt" date, "total" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_60284980bc8b9c624459948f4ac" UNIQUE ("number"), CONSTRAINT "PK_15d25c200d9bcd8a33f698daf18" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."repo_provider_enum" AS ENUM('GITHUB', 'GITLAB')`);
        await queryRunner.query(`CREATE TABLE "repo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "provider" "public"."repo_provider_enum" NOT NULL DEFAULT 'GITHUB', "externalId" character varying NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_6c3318a15f9a297481f341128cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."task_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'DONE')`);
        await queryRunner.query(`CREATE TABLE "task" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "title" character varying NOT NULL, "status" "public"."task_status_enum" NOT NULL DEFAULT 'OPEN', "assigneeId" uuid, "githubIssueUrl" character varying, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "release" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "version" character varying, "title" character varying NOT NULL, "bodyMd" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1a2253436964eea9c558f9464f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "time_entry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "taskId" uuid, "userId" uuid NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "kind" character varying NOT NULL DEFAULT 'DEV', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8bc1870af1779c749f9026ec508" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoice_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceId" uuid NOT NULL, "description" character varying NOT NULL, "qty" integer NOT NULL DEFAULT '1', "unitPrice" integer NOT NULL, CONSTRAINT "PK_621317346abdf61295516f3cb76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."changelog_item_type_enum" AS ENUM('FEATURE', 'FIX', 'CHORE')`);
        await queryRunner.query(`CREATE TABLE "changelog_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "releaseId" uuid NOT NULL, "type" "public"."changelog_item_type_enum" NOT NULL, "title" character varying NOT NULL, "url" character varying, CONSTRAINT "PK_c7fe3bf96c2cd0fb6f484c7705c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "api_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "keyHash" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "lastUsedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b1bd840641b8acbaad89c3d8d11" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "organization" ADD CONSTRAINT "FK_67c515257c7a4bc221bb1857a39" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_member" ADD CONSTRAINT "FK_0994de574a3dd40608e7dc7e3d7" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_member" ADD CONSTRAINT "FK_e51b569198779321f3d818d8f24" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client" ADD CONSTRAINT "FK_b2d46da78776decb61181039deb" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_fe67adbc435f2864cf458df7c33" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_6b6a346d8c6b35400cc8201602b" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_f18e9b95fe80b1f554d1cb6c23b" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "repo" ADD CONSTRAINT "FK_c616d85d485c650f4afa4c963c9" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_7384988f7eeb777e44802a0baca" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "release" ADD CONSTRAINT "FK_f47da974d2cab31cfa0ce0d812e" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entry" ADD CONSTRAINT "FK_2c66c4cdddd1bc3d400178df926" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entry" ADD CONSTRAINT "FK_71f8e40daa17b22aec1d131469d" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entry" ADD CONSTRAINT "FK_3f62e581c375f7c408ed107d7b6" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_item" ADD CONSTRAINT "FK_553d5aac210d22fdca5c8d48ead" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "changelog_item" ADD CONSTRAINT "FK_33adbcd3e807c242e0444f3c90f" FOREIGN KEY ("releaseId") REFERENCES "release"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "changelog_item" DROP CONSTRAINT "FK_33adbcd3e807c242e0444f3c90f"`);
        await queryRunner.query(`ALTER TABLE "invoice_item" DROP CONSTRAINT "FK_553d5aac210d22fdca5c8d48ead"`);
        await queryRunner.query(`ALTER TABLE "time_entry" DROP CONSTRAINT "FK_3f62e581c375f7c408ed107d7b6"`);
        await queryRunner.query(`ALTER TABLE "time_entry" DROP CONSTRAINT "FK_71f8e40daa17b22aec1d131469d"`);
        await queryRunner.query(`ALTER TABLE "time_entry" DROP CONSTRAINT "FK_2c66c4cdddd1bc3d400178df926"`);
        await queryRunner.query(`ALTER TABLE "release" DROP CONSTRAINT "FK_f47da974d2cab31cfa0ce0d812e"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_7384988f7eeb777e44802a0baca"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe"`);
        await queryRunner.query(`ALTER TABLE "repo" DROP CONSTRAINT "FK_c616d85d485c650f4afa4c963c9"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_f18e9b95fe80b1f554d1cb6c23b"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_6b6a346d8c6b35400cc8201602b"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_fe67adbc435f2864cf458df7c33"`);
        await queryRunner.query(`ALTER TABLE "client" DROP CONSTRAINT "FK_b2d46da78776decb61181039deb"`);
        await queryRunner.query(`ALTER TABLE "org_member" DROP CONSTRAINT "FK_e51b569198779321f3d818d8f24"`);
        await queryRunner.query(`ALTER TABLE "org_member" DROP CONSTRAINT "FK_0994de574a3dd40608e7dc7e3d7"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP CONSTRAINT "FK_67c515257c7a4bc221bb1857a39"`);
        await queryRunner.query(`DROP TABLE "api_key"`);
        await queryRunner.query(`DROP TABLE "changelog_item"`);
        await queryRunner.query(`DROP TYPE "public"."changelog_item_type_enum"`);
        await queryRunner.query(`DROP TABLE "invoice_item"`);
        await queryRunner.query(`DROP TABLE "time_entry"`);
        await queryRunner.query(`DROP TABLE "release"`);
        await queryRunner.query(`DROP TABLE "task"`);
        await queryRunner.query(`DROP TYPE "public"."task_status_enum"`);
        await queryRunner.query(`DROP TABLE "repo"`);
        await queryRunner.query(`DROP TYPE "public"."repo_provider_enum"`);
        await queryRunner.query(`DROP TABLE "invoice"`);
        await queryRunner.query(`DROP TYPE "public"."invoice_status_enum"`);
        await queryRunner.query(`DROP TABLE "project"`);
        await queryRunner.query(`DROP TYPE "public"."project_status_enum"`);
        await queryRunner.query(`DROP TABLE "client"`);
        await queryRunner.query(`DROP TABLE "org_member"`);
        await queryRunner.query(`DROP TABLE "organization"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "webhook_event"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_event_status_enum"`);
    }

}
