export const ACCOUNT_TYPES = ['student', 'staff', 'lecturer', 'visitor', 'contractor', 'other'];

export const SYSTEM_ROLES = ['passenger', 'rider', 'admin'];

export const RIDE_STATUSES = [
  'REQUESTED',
  'SEARCHING',
  'ACCEPTED',
  'ARRIVING',
  'STARTED',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];

export function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isOneOf(value, allowed) {
  return allowed.includes(value);
}
