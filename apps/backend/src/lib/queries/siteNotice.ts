import { knexController } from '../../database/database';
import { convertDateToMariaDBDateTime } from '../utils/dateTime';
import {
  type CreateSiteNoticeBody,
  type SiteNotice,
  type SiteNoticeWithPoster,
  type UpdateSiteNoticeBody,
} from '../../types/siteNotice.types';
import { type DBResponse } from '../../types/general.types';

const NOTICE_COLUMNS = [
  'sn.id',
  'sn.message',
  'sn.show_logbook AS showLogbook',
  'sn.show_blender_logbook AS showBlenderLogbook',
  'sn.active_from AS activeFrom',
  'sn.active_to AS activeTo',
  'sn.created_by AS createdBy',
  'sn.created_at AS createdAt',
].join(', ');

const NOTICE_WITH_POSTER_COLUMNS = [
  NOTICE_COLUMNS,
  "CONCAT(u.forename, ' ', u.surname) AS posterName",
].join(', ');

export const getActiveNotices = async (): Promise<SiteNotice[]> => {
  const now = new Date(Date.now());

  const [rows] = await knexController.raw<DBResponse<SiteNotice[]>>(
    `SELECT ${NOTICE_COLUMNS}
     FROM site_notice sn
     WHERE sn.active_from <= :now
       AND (sn.active_to IS NULL OR sn.active_to > :now)
     ORDER BY sn.active_from DESC`,
    { now },
  );

  return rows ?? [];
};

export const getAllNotices = async (): Promise<SiteNoticeWithPoster[]> => {
  const [rows] = await knexController.raw<DBResponse<SiteNoticeWithPoster[]>>(
    `SELECT ${NOTICE_WITH_POSTER_COLUMNS}
     FROM site_notice sn
     JOIN user u ON sn.created_by = u.id
     ORDER BY sn.active_from DESC`,
  );

  return rows ?? [];
};

export const createNotice = async (
  body: CreateSiteNoticeBody,
  createdBy: string,
): Promise<SiteNotice> => {
  const activeFrom = convertDateToMariaDBDateTime(new Date(body.activeFrom));
  const activeTo = body.activeTo
    ? convertDateToMariaDBDateTime(new Date(body.activeTo))
    : null;

  const res = await knexController.raw<[{ insertId: number }]>(
    `INSERT INTO site_notice
       (message, show_logbook, show_blender_logbook, active_from, active_to, created_by, created_at)
     VALUES
       (:message, :showLogbook, :showBlenderLogbook, :activeFrom, :activeTo, :createdBy, NOW())`,
    {
      message: body.message,
      showLogbook: body.showLogbook,
      showBlenderLogbook: body.showBlenderLogbook,
      activeFrom,
      activeTo,
      createdBy,
    },
  );

  const id = String(res[0].insertId);
  const notice = await getNoticeById(id);
  if (!notice) throw new Error('Site notice creation failed');

  return notice;
};

export const getNoticeById = async (
  id: string,
): Promise<SiteNotice | undefined> => {
  const [rows] = await knexController.raw<DBResponse<SiteNotice[]>>(
    `SELECT ${NOTICE_COLUMNS} FROM site_notice sn WHERE sn.id = :id`,
    { id },
  );

  return rows[0];
};

export const updateNotice = async (
  id: string,
  body: UpdateSiteNoticeBody,
): Promise<SiteNotice | undefined> => {
  const fields: Record<string, unknown> = {};

  if (body.message !== undefined) fields.message = body.message;
  if (body.showLogbook !== undefined) fields.show_logbook = body.showLogbook;
  if (body.showBlenderLogbook !== undefined)
    fields.show_blender_logbook = body.showBlenderLogbook;
  if (body.activeFrom !== undefined)
    fields.active_from = convertDateToMariaDBDateTime(
      new Date(body.activeFrom),
    );
  if ('activeTo' in body)
    fields.active_to = body.activeTo
      ? convertDateToMariaDBDateTime(new Date(body.activeTo))
      : null;

  const setClauses = Object.keys(fields)
    .map((col) => `${col} = :${col}`)
    .join(', ');

  await knexController.raw(
    `UPDATE site_notice SET ${setClauses} WHERE id = :id`,
    { ...fields, id },
  );

  return getNoticeById(id);
};

export const deleteNotice = async (id: string): Promise<boolean> => {
  const res = await knexController.raw<[{ affectedRows: number }]>(
    `DELETE FROM site_notice WHERE id = :id`,
    { id },
  );

  return res[0].affectedRows > 0;
};
