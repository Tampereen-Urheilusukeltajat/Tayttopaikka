import { Type, type Static } from '@sinclair/typebox';

export const siteNotice = Type.Object({
  id: Type.Integer(),
  message: Type.String(),
  showLogbook: Type.Boolean(),
  showBlenderLogbook: Type.Boolean(),
  activeFrom: Type.String({ format: 'date-time' }),
  activeTo: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  createdBy: Type.String(),
});

export type SiteNotice = Static<typeof siteNotice>;

export const siteNoticeWithPoster = Type.Intersect([
  siteNotice,
  Type.Object({ posterName: Type.String() }),
]);

export type SiteNoticeWithPoster = Static<typeof siteNoticeWithPoster>;

export const createSiteNoticeBody = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 2000 }),
  showLogbook: Type.Boolean(),
  showBlenderLogbook: Type.Boolean(),
  activeFrom: Type.String({ format: 'date-time' }),
  activeTo: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

export type CreateSiteNoticeBody = Static<typeof createSiteNoticeBody>;

export const updateSiteNoticeBody = Type.Partial(
  Type.Object({
    message: Type.String({ minLength: 1, maxLength: 2000 }),
    showLogbook: Type.Boolean(),
    showBlenderLogbook: Type.Boolean(),
    activeFrom: Type.String({ format: 'date-time' }),
    activeTo: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  }),
);

export type UpdateSiteNoticeBody = Static<typeof updateSiteNoticeBody>;
