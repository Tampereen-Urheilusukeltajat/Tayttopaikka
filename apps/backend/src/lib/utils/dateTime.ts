/**
 * MariaDB DateTime
 */
type DateTime = string;

const pad = (n: number): string => String(n).padStart(2, '0');

export const convertDateToMariaDBDateTime = (date: Date): DateTime =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
