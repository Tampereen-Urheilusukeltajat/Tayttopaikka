// User related query keys
export const USER_QUERY_KEY = (userId: string): string[] => ['user', userId];
export const USERS_QUERY_KEY = ['users'];
export const ARCHIVED_USERS_QUERY_KEY = ['archivedUsers'];

// Diving cylinder set related query keys
export const DIVING_CYLINDER_SETS_QUERY_KEY = (userId: string): string[] => [
  'divingCylinderSets',
  userId,
];
export const CLUB_CYLINDER_SETS_QUERY_KEY = ['clubCylinderSets'];

// Storage cylinder query keys
export const STORAGE_CYLINDERS_QUERY_KEY = ['storageCylinder'];

// Fill event related query keys
export const FILL_EVENT_QUERY_KEY = ['fillEvents'];
export const BARE_FILL_EVENT_QUERY_KEY = ['bareFillEvents'];

// Gas
export const GAS_QUERY = ['gas'];
export const GAS_ALL_PRICES_QUERY = ['gasAllPrices'];

// Compressor
export const COMPRESSOR_QUERY_KEY = ['compressor'];

// Invoice
export const INVOICE_QUERY_KEY = ['invoice'];

// Payment events
export const PAYMENT_EVENTS_QUERY_KEY = ['paymentEvents'];

// Site notices
export const NOTICES_QUERY_KEY = ['notices'];
export const ADMIN_NOTICES_QUERY_KEY = ['adminNotices'];
