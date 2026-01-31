import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDueDateChanges1738300000000 implements MigrationInterface {
  name = 'AddDueDateChanges1738300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create due_date_changes table
    await queryRunner.query(`
      CREATE TABLE "due_date_changes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "clickup_task_id" character varying NOT NULL,
        "previous_due_date" bigint,
        "new_due_date" bigint,
        "changed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_due_date_changes" PRIMARY KEY ("id")
      )
    `);

    // Create index for efficient leaderboard queries
    await queryRunner.query(
      `CREATE INDEX "IDX_due_date_changes_clickup_task_id" ON "due_date_changes" ("clickup_task_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_due_date_changes_clickup_task_id"`,
    );
    await queryRunner.query(`DROP TABLE "due_date_changes"`);
  }
}
