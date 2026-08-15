/**
 * Restrict a route to specific system roles.
 * Usage: router.get('/', requireRole('admin'), handler)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    if (!roles.includes(req.user.systemRole)) {
      return res.status(403).json({ error: { message: 'You do not have permission to perform this action' } });
    }
    return next();
  };
}
