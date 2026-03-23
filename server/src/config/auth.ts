export const JWT_CONFIG = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '2h',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};
