import { verifyToken } from '../utils/jwt.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Protect a route: requires a valid `Authorization: Bearer <token>` header.
 * Attaches req.user = { id, systemRole, accountType } on success.
 */
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      systemRole: payload.systemRole,
      accountType: payload.accountType,
    };
    return next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
});
