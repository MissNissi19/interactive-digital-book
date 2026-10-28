import { factories } from '@strapi/strapi';
import type { Core, UID } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * Every "student-owned" collection has a `student` relation to the
 * Users & Permissions user. The controller below forces that relation on
 * create and scopes every read/update/delete to the logged-in student, so
 * each student only ever sees their own entries while admins see everything
 * in the Strapi dashboard.
 */
export const OWNER_FIELD = 'student';

type AnyRecord = Record<string, any>;

const ownerFilter = (userId: number) => ({ [OWNER_FIELD]: { id: { $eq: userId } } });

export const createStudentOwnedController = (uid: UID.ContentType) =>
  factories.createCoreController(uid, ({ strapi }) => {
    const service = () => strapi.service(uid) as Core.CoreAPI.Service.CollectionType;

    const findOwned = (documentId: string, userId: number, query: AnyRecord = {}) =>
      strapi.documents(uid).findFirst({
        ...query,
        filters: { $and: [query.filters ?? {}, { documentId: { $eq: documentId } }, ownerFilter(userId)] },
      });

    const readBody = (ctx: AnyRecord): AnyRecord => {
      const { body = {} } = ctx.request;
      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }
      const data: AnyRecord = { ...body.data };
      delete data[OWNER_FIELD];
      return data;
    };

    return {
      async find(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const { results, pagination } = await service().find({
          ...sanitizedQuery,
          filters: { $and: [sanitizedQuery.filters ?? {}, ownerFilter(user.id)] },
        });
        const sanitizedResults = await this.sanitizeOutput!(results, ctx);
        return this.transformResponse!(sanitizedResults, { pagination });
      },

      async findOne(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const entity = await findOwned(ctx.params.id, user.id, sanitizedQuery);
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
        await this.validateInput!(data, ctx);
        const sanitizedInputData = (await this.sanitizeInput!(data, ctx)) as AnyRecord;

        const entity = await service().create({
          ...sanitizedQuery,
          data: { ...sanitizedInputData, [OWNER_FIELD]: user.id },
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
        const existing = await findOwned(ctx.params.id, user.id);
        if (!existing) return ctx.notFound();

        const data = readBody(ctx);
        await this.validateInput!(data, ctx);
        const sanitizedInputData = (await this.sanitizeInput!(data, ctx)) as AnyRecord;

        const entity = await service().update(ctx.params.id, {
          ...sanitizedQuery,
          data: { ...sanitizedInputData, [OWNER_FIELD]: user.id },
        });
        const sanitizedEntity = await this.sanitizeOutput!(entity, ctx);
        return this.transformResponse!(sanitizedEntity);
      },

      async delete(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        await this.validateQuery!(ctx);
        const sanitizedQuery = (await this.sanitizeQuery!(ctx)) as AnyRecord;
        const existing = await findOwned(ctx.params.id, user.id);
        if (!existing) return ctx.notFound();

        await service().delete(ctx.params.id, sanitizedQuery);
        ctx.status = 204;
      },
    };
  });
