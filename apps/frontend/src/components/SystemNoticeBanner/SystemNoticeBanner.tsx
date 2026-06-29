import React from 'react';
import { Alert } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { useNoticesQuery } from '../../lib/queries/noticeQuery';
import { type SiteNotice } from '../../interfaces/SiteNotice';

const isNoticeVisibleOnPath = (notice: SiteNotice, pathname: string): boolean => {
  if (pathname === '/logbook') return notice.showLogbook;
  if (pathname === '/blender-logbook') return notice.showBlenderLogbook;
  return false;
};

export const SystemNoticeBanner: React.FC = () => {
  const { data: notices } = useNoticesQuery();
  const { pathname } = useLocation();

  const visible = (notices ?? []).filter((n) =>
    isNoticeVisibleOnPath(n, pathname),
  );

  if (visible.length === 0) return null;

  return (
    <div>
      {visible.map((notice) => (
        <Alert key={notice.id} variant="warning" className="mb-0 rounded-0">
          {notice.message}
        </Alert>
      ))}
    </div>
  );
};
