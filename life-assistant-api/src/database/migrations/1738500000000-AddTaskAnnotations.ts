import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAnnotations1738500000000 implements MigrationInterface {
  name = 'AddTaskAnnotations1738500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_annotations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "task_id" character varying NOT NULL,
        "source" character varying NOT NULL,
        "time_of_day" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_annotations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_task_annotations_task_id_source" ON "task_annotations" ("task_id", "source")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_task_annotations_task_id_source"`);
    await queryRunner.query(`DROP TABLE "task_annotations"`);
  }
}
