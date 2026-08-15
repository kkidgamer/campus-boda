import axios from 'axios';
import env from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * M-Pesa Daraja (Lipa Na M-Pesa Online / STK Push) client.
 *
 * Modes:
 *  - simulation: no Safaricom credentials needed; returns deterministic fake
 *    responses so the whole payment flow can be built and tested locally.
 *  - sandbox / production: real Daraja API calls (requires MPESA_CONSUMER_KEY,
 *    MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY in .env).
 */

const PASSWORD_TIMESTAMP_FORMAT = 'YYYYMMDDHHmmss';

let cachedToken = null;
let cachedTokenExpiry = 0;

/** Normalize a phone number to 2547XXXXXXXX (E.164 without the +). */
export function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) return `254${digits}`;
  return digits;
}

export function isSimulationMode() {
  return env.mpesa.env === 'simulation';
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** OAuth access token, cached for ~55 minutes. */
async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;

  const auth = Buffer.from(
    `${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`
  ).toString('base64');

  const { data } = await axios.get(
    `${env.mpesa.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (Number(data.expires_in || 3600) - 300) * 1000;
  return cachedToken;
}

/**
 * Initiate an STK Push to the customer's phone.
 * Returns { merchantRequestId, checkoutRequestId, responseCode, responseDescription }.
 */
export async function stkPush({ phone, amount, accountReference, description }) {
  if (env.mpesa.env === 'sandbox' && normalizePhone(phone).startsWith('2547')) {
    logger.warn('Sandbox STK push only works with Daraja test numbers (2547...) — real numbers need production.');
  }

  const time = timestamp();
  const password = Buffer.from(
    `${env.mpesa.shortcode}${env.mpesa.passkey}${time}`
  ).toString('base64');

  const token = await getAccessToken();
  const { data } = await axios.post(
    `${env.mpesa.baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: env.mpesa.shortcode,
      Password: password,
      Timestamp: time,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: normalizePhone(phone),
      PartyB: env.mpesa.shortcode,
      PhoneNumber: normalizePhone(phone),
      CallBackURL: env.mpesa.callbackUrl,
      AccountReference: accountReference || 'Campus Boda',
      TransactionDesc: description || 'Campus Boda ride payment',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
  };
}

/** Query the status of an STK push using its CheckoutRequestID. */
export async function queryStatus(checkoutRequestId) {
  const time = timestamp();
  const password = Buffer.from(
    `${env.mpesa.shortcode}${env.mpesa.passkey}${time}`
  ).toString('base64');
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${env.mpesa.baseUrl}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: env.mpesa.shortcode,
      Password: password,
      Timestamp: time,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return {
    responseCode: data.ResponseCode,
    resultCode: data.ResultCode,
    resultDesc: data.ResultDesc,
  };
}

/**
 * Pay via M-Pesa. In simulation mode this returns a deterministic fake
 * CheckoutRequestID; otherwise it performs a real STK push.
 */
export async function payViaMpesa({ phone, amount, accountReference }) {
  if (isSimulationMode()) {
    logger.info(`[MPESA simulation] STK push to ${normalizePhone(phone)} for KSh ${amount}`);
    return {
      simulated: true,
      merchantRequestId: 'SIM-MR-1',
      checkoutRequestId: `SIM-CHK-${Date.now()}`,
      responseCode: '0',
      responseDescription: 'Success (simulated)',
    };
  }
  return stkPush({ phone, amount, accountReference });
}

export { PASSWORD_TIMESTAMP_FORMAT };
