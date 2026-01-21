import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1737420000000 implements MigrationInterface {
  name = 'InitialSchema1737420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create task_mappings table
    await queryRunner.query(`
      CREATE TABLE "task_mappings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wrike_id" character varying NOT NULL,
        "clickup_id" character varying NOT NULL,
        "integration_type" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" character varying,
        CONSTRAINT "UQ_task_mappings_wrike_id" UNIQUE ("wrike_id"),
        CONSTRAINT "UQ_task_mappings_clickup_id" UNIQUE ("clickup_id"),
        CONSTRAINT "PK_task_mappings" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for task_mappings
    await queryRunner.query(
      `CREATE INDEX "IDX_task_mappings_wrike_id" ON "task_mappings" ("wrike_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_mappings_clickup_id" ON "task_mappings" ("clickup_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_mappings_user_id" ON "task_mappings" ("user_id")`,
    );

    // Create sync_logs table
    await queryRunner.query(`
      CREATE TABLE "sync_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "source_platform" character varying NOT NULL,
        "target_platform" character varying NOT NULL,
        "source_task_id" character varying NOT NULL,
        "target_task_id" character varying NOT NULL,
        "action" character varying NOT NULL,
        "status" character varying NOT NULL,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sync_logs" PRIMARY KEY ("id")
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "wrike_token" character varying,
        "clickup_token" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "sync_logs"`);
    await queryRunner.query(`DROP INDEX "IDX_task_mappings_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_task_mappings_clickup_id"`);
    await queryRunner.query(`DROP INDEX "IDX_task_mappings_wrike_id"`);
    await queryRunner.query(`DROP TABLE "task_mappings"`);
  }
}
