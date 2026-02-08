export type ArchivedUser = {
  id: string;
  email: string | null;
  forename: string | null;
  surname: string | null;
  lastLogin: string;
  archivedAt: string;
  monthsInactive: number;
  unpaidInvoicesCount: number;
};
