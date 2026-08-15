import { isDatabaseConnected } from '../config/database.js';
import env from '../config/environment.js';

export function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'campus-boda-api',
    db: isDatabaseConnected() ? 'connected' : 'disconnected',
    mpesa: env.mpesa.env,
  });
}
