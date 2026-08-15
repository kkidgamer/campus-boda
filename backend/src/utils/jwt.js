import jwt from 'jsonwebtoken';
import env from '../config/environment.js';

/** Sign a JWT access token for a user. */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      systemRole: user.systemRole,
      accountType: user.accountType,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

/** Sign a JWT refresh token for a user (longer-lived, marked as refresh). */
export function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      systemRole: user.systemRole,
      accountType: user.accountType,
      type: 'refresh',
    },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );
}

/** Verify a JWT and return its payload, or throw. */
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
