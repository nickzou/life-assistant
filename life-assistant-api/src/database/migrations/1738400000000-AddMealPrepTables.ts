import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMealPrepTables1738400000000 implements MigrationInterface {
  name = 'AddMealPrepTables1738400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create recipe_prep_configs table
    await queryRunner.query(`
      CREATE TABLE "recipe_prep_configs" (
        "id" SERIAL NOT NULL,
        "grocy_recipe_id" integer NOT NULL,
        "requires_defrost" boolean NOT NULL DEFAULT false,
        "defrost_item" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_recipe_prep_configs_grocy_recipe_id" UNIQUE ("grocy_recipe_id"),
        CONSTRAINT "PK_recipe_prep_configs" PRIMARY KEY ("id")
      )
    `);

    // Create index for recipe_prep_configs
    await queryRunner.query(
      `CREATE INDEX "IDX_recipe_prep_configs_grocy_recipe_id" ON "recipe_prep_configs" ("grocy_recipe_id")`,
    );

    // Create meal_plan_task_mappings table
    await queryRunner.query(`
      CREATE TABLE "meal_plan_task_mappings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "meal_plan_item_id" integer NOT NULL,
        "clickup_task_id" character varying NOT NULL,
        "task_type" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meal_plan_task_mappings" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for meal_plan_task_mappings
    await queryRunner.query(
      `CREATE INDEX "IDX_meal_plan_task_mappings_meal_plan_item_id" ON "meal_plan_task_mappings" ("meal_plan_item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_meal_plan_task_mappings_clickup_task_id" ON "meal_plan_task_mappings" ("clickup_task_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_meal_plan_task_mappings_clickup_task_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_meal_plan_task_mappings_meal_plan_item_id"`,
    );
    await queryRunner.query(`DROP TABLE "meal_plan_task_mappings"`);
    await queryRunner.query(
      `DROP INDEX "IDX_recipe_prep_configs_grocy_recipe_id"`,
    );
    await queryRunner.query(`DROP TABLE "recipe_prep_configs"`);
  }
}
