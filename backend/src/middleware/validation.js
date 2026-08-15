import { isValidEmail, isOneOf } from '../utils/validators.js';

/**
 * Require that the listed fields are present (and non-empty) in the request body.
 * Usage: router.post('/', requireFields('name', 'email', 'phone'), handler)
 */
export function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || value === '';
    });
    if (missing.length > 0) {
      return res.status(400).json({
        error: {
          message: `Missing required field(s): ${missing.join(', ')}`,
          fields: missing,
        },
      });
    }
    return next();
  };
}

/** Validate that req.body.email is a well-formed email address. */
export function validateEmail(req, res, next) {
  if (req.body?.email && !isValidEmail(req.body.email)) {
    return res.status(400).json({ error: { message: 'A valid email address is required' } });
  }
  return next();
}

/**
 * Validate that a field is one of a set of allowed values.
 * Usage: router.post('/', validateEnum('accountType', ACCOUNT_TYPES), handler)
 */
export function validateEnum(field, allowed) {
  return (req, res, next) => {
    const value = req.body?.[field];
    if (value !== undefined && !isOneOf(value, allowed)) {
      return res.status(400).json({
        error: {
          message: `Invalid ${field}. Allowed values: ${allowed.join(', ')}`,
        },
      });
    }
    return next();
  };
}
