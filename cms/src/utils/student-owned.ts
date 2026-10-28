import { factories } from '@strapi/strapi';
import type { Core, UID } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * Every "student-owned" collection has a `student` relation to the
 * Users & Permissions user.
 *
 * - Students: the controller forces `student` to the logged-in user on create
 *   and scopes every read/update/delete to their own entries.
 * - Teachers (role type "teacher", used by the Next.js /admin dashboard): no
 *   scoping, and they may set `student` explicitly to manage any student's data.
 * - Strapi admins see everything in the dashboard as usual.
 */
export const OWNER_FIELD = 'student';
export const TEACHER_ROLE = 'teacher';

type AnyRecord = Record<string, any>;

const ownerFilter = (userId: number) => ({ [OWNER_FIELD]: { id: { $eq: userId } } });

export const isTeacher = (user: AnyRecord | undefined) => user?.role?.type === TEACHER_ROLE;

export const createStudentOwnedController = (uid: UID.ContentType) =>
  factories.createCoreController(uid, ({ strapi }) => {
    const service = () => strapi.service(uid) as Core.CoreAPI.Service.CollectionType;

    const scopedFilters = (user: AnyRecord, filters: AnyRecord | undefined) =>
      isTeacher(user) ? filters ?? {} : { $and: [filters ?? {}, ownerFilter(user.id)] };

    const findVisible = (documentId: string, user: AnyRecord, query: AnyRecord = {}) =>
      strapi.documents(uid).findFirst({
        ...query,
        filters: { $and: [scopedFilters(user, query.filters), { documentId: { $eq: documentId } }] },
      });

    const readBody = (ctx: AnyRecord): AnyRecord => {
      const { body = {} } = ctx.request;
      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }
      return { ...body.data };
    };

    /** Owner to store: students always own their entries; teachers choose the student. */
    const ownerFor = (user: AnyRecord, data: AnyRecord, fallback?: unknown) => {
      if (!isTeacher(user)) return user.id;
      const requested = data[OWNER_FIELD];
      const owner =
        requested && typeof requested === 'object' ? requested.id ?? requested.documentId : requested;
      return owner ?? fallback;
    };

    const sanitizeData = async function (this: AnyRecord, data: AnyRecord, ctx: AnyRecord) {
      const input = { ...data };
      delete input[OWNER_FIELD];
      await this.validateInput!(input, ctx);
      return (await this.sanitizeInput!(input, ctx)) as AnyRecord;
    };

    return {
      async find(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const { results, pagination } = await service().find({
          ...sanitizedQuery,
          filters: scopedFilters(user, sanitizedQuery.filters),
        });
        const sanitizedResults = await this.sanitizeOutput!(results, ctx);
        return this.transformResponse!(sanitizedResults, { pagination });
      },

      async findOne(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const entity = await findVisible(ctx.params.id, user, sanitizedQuery);
        if (!entity) return ctx.notFound();

        const sanitizedEntity = await this.sanitizeOutput!(entity, ctx);
        return this.transformResponse!(sanitizedEntity);
      },

      async create(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const data = readBody(ctx);
        const owner = ownerFor(user, data);
        if (!owner) {
          throw new errors.ValidationError(`"${OWNER_FIELD}" is required when creating entries as a teacher`);
        }
        const sanitizedInputData = await sanitizeData.call(this, data, ctx);

        const entity = await service().create({
          ...sanitizedQuery,
          data: { ...sanitizedInputData, [OWNER_FIELD]: owner },
        });
        const sanitizedEntity = await this.sanitizeOutput!(entity, ctx);
        ctx.status = 201;
        return this.transformResponse!(sanitizedEntity);
      },

      async update(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const existing = await findVisible(ctx.params.id, user, { populate: [OWNER_FIELD] });
        if (!existing) return ctx.notFound();

        const data = readBody(ctx);
        const owner = ownerFor(user, data, (existing as AnyRecord)[OWNER_FIELD]?.id);
        const sanitizedInputData = await sanitizeData.call(this, data, ctx);

        const entity = await service().update(ctx.params.id, {
          ...sanitizedQuery,
          data: { ...sanitizedInputData, ...(owner ? { [OWNER_FIELD]: owner } : {}) },
        });
        const sanitizedEntity = await this.sanitizeOutput!(entity, ctx);
        return this.transformResponse!(sanitizedEntity);
      },

      async delete(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const existing = await findVisible(ctx.params.id, user);
        if (!existing) return ctx.notFound();

        await service().delete(ctx.params.id, sanitizedQuery);
        ctx.status = 204;
      },
    };
  });
