import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_cleanup_audit', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable().references('id').inTable('user');
    table.string('action', 50).notNullable();
    table.text('reason').nullable();
    table.dateTime('last_login_date').nullable();
    table.dateTime('executed_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'action'], 'idx_user_action');
    table.index('executed_at', 'idx_executed_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  // noop
}
