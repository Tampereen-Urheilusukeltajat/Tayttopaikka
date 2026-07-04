export type SiteNotice = {
  id: number;
  message: string;
  showLogbook: boolean;
  showBlenderLogbook: boolean;
  activeFrom: string;
  activeTo: string | null;
  createdBy: string;
  createdAt: string;
};

export type SiteNoticeWithPoster = SiteNotice & {
  posterName: string;
};

export type CreateSiteNoticePayload = {
  message: string;
  showLogbook: boolean;
  showBlenderLogbook: boolean;
  activeFrom: string;
  activeTo: string | null;
};

export type UpdateSiteNoticePayload = {
  message?: string;
  showLogbook?: boolean;
  showBlenderLogbook?: boolean;
  activeFrom?: string;
  activeTo?: string | null;
};
