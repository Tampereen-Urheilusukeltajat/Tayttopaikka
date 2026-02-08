import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_cleanup_audit', (table) => {
    table
      .uuid('performed_by_user_id')
      .nullable()
      .references('id')
      .inTable('user')
      .comment('User who performed the action (null for automated actions)');

    table.index('performed_by_user_id', 'idx_performed_by_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // noop
}
