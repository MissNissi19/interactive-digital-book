import type { Core } from '@strapi/strapi';
import { TEACHER_ROLE } from './utils/student-owned';

/** Collections where every entry belongs to exactly one student. */
const STUDENT_OWNED = [
  'api::test-result.test-result',
  'api::exercise-attempt.exercise-attempt',
  'api::student-progress.student-progress',
];

/** Shared book content, readable by everyone. */
const BOOK_CONTENT = [
  'api::chapter.chapter',
  'api::scenario.scenario',
  'api::drill.drill',
  'api::question.question',
  'api::test.test',
  'api::alphabet-entry.alphabet-entry',
];

const READ_ACTIONS = ['find', 'findOne'];
const CRUD_ACTIONS = ['find', 'findOne', 'create', 'update', 'delete'];

const actionsFor = (uids: string[], actions: string[]) =>
  uids.flatMap((uid) => actions.map((action) => `${uid}.${action}`));

const bookContentActions = [
  ...actionsFor(BOOK_CONTENT, READ_ACTIONS),
  'api::book-setting.book-setting.find',
];

/** What the Next.js /admin dashboard (teacher account) may do with student accounts. */
const teacherUserActions = [
  ...['find', 'findOne', 'count', 'create', 'update'].map(
    (action) => `plugin::users-permissions.user.${action}`,
  ),
  // Needed so `populate[role]` works on /api/users responses.
  'plugin::users-permissions.role.find',
  'plugin::users-permissions.role.findOne',
];

async function ensureRole(
  strapi: Core.Strapi,
  role: { name: string; type: string; description: string },
) {
  const existing = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: role.type } });
  if (existing) return existing;

  strapi.log.info(`[permissions] creating role "${role.type}"`);
  return strapi.db.query('plugin::users-permissions.role').create({ data: role });
}

async function grantPermissions(strapi: Core.Strapi, roleType: string, actions: string[]) {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });
  if (!role) return;

  const existing = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { role: { id: role.id } }, select: ['action'] });
  const granted = new Set(existing.map((permission: { action: string }) => permission.action));

  for (const action of actions) {
    if (granted.has(action)) continue;
    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { action, role: role.id } });
    strapi.log.info(`[permissions] granted ${action} to role "${roleType}"`);
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Visitors (and the Next.js frontend) can read the book content.
    await grantPermissions(strapi, 'public', bookContentActions);

    // Logged-in students can read the book and manage their own results/progress.
    // The controllers in src/utils/student-owned.ts scope every request to the
    // logged-in student, so these permissions never expose another student's data.
    await grantPermissions(strapi, 'authenticated', [
      ...bookContentActions,
      ...actionsFor(STUDENT_OWNED, CRUD_ACTIONS),
    ]);

    // Teachers use the Next.js /admin dashboard: they manage student accounts
    // and every student's progress/results. Assign this role to a user in
    // Content Manager → User → role.
    await ensureRole(strapi, {
      name: 'Teacher',
      type: TEACHER_ROLE,
      description: 'Manages students and their progress from the /admin dashboard',
    });
    await grantPermissions(strapi, TEACHER_ROLE, [
      ...bookContentActions,
      ...actionsFor(STUDENT_OWNED, CRUD_ACTIONS),
      ...teacherUserActions,
      'plugin::users-permissions.user.me',
    ]);
  },
};
