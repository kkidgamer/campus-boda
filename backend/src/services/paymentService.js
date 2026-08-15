import Payment from '../models/Payment.js';
import { payViaMpesa, isSimulationMode } from './mpesaService.js';

/**
 * Initiate M-Pesa payment for a completed ride.
 * - Requires the ride to be COMPLETED.
 * - Only one payment per ride (rideId is unique on Payment).
 * Returns the created (pending) payment and the M-Pesa response.
 */
export async function initiatePayment({ ride, passengerId, amount, phone }) {
  const existing = await Payment.findOne({ rideId: ride._id });
  if (existing) {
    return { error: { status: 409, message: 'A payment for this ride already exists' } };
  }

  const mpesa = await payViaMpesa({
    phone,
    amount,
    accountReference: `RIDE-${ride._id.toString().slice(-8)}`,
  });

  const payment = await Payment.create({
    rideId: ride._id,
    passengerId,
    riderId: ride.riderId,
    amount,
    method: 'mpesa',
    status: 'pending',
    transactionId: mpesa.checkoutRequestId,
  });

  return {
    payment,
    mpesa,
    simulated: mpesa.simulated || isSimulationMode(),
  };
}

/** Mark a pending payment as paid. */
export async function confirmPayment(payment, { receipt, amount } = {}) {
  payment.status = 'paid';
  payment.mpesaReceipt = receipt || `SIM-${Date.now().toString().slice(-8)}`;
  if (amount) payment.amount = amount;
  payment.paidAt = new Date();
  await payment.save();
  return payment;
}

/** Mark a pending payment as failed. */
export async function failPayment(payment, reason = '') {
  payment.status = 'failed';
  if (reason) payment.transactionId = `${payment.transactionId} (${reason})`;
  await payment.save();
  return payment;
}

/**
 * Handle an STK push callback from M-Pesa.
 * Body: { Body: { stkCallback: { MerchantRequestID, CheckoutRequestID,
 *        ResultCode, ResultDesc, CallbackMetadata: { Item: [...] } } } }
 * Returns { handled: true } when the callback matched a known payment.
 */
export async function handleMpesaCallback(body) {
  const stk = body?.Body?.stkCallback;
  if (!stk?.CheckoutRequestID) {
    return { handled: false };
  }

  const payment = await Payment.findOne({ transactionId: stk.CheckoutRequestID });
  if (!payment) {
    return { handled: false };
  }
  if (payment.status === 'paid') {
    return { handled: true };
  }

  if (String(stk.ResultCode) === '0') {
    const items = stk.CallbackMetadata?.Item || [];
    const get = (name) => items.find((i) => i.Name === name)?.Value;
    await confirmPayment(payment, {
      receipt: get('MpesaReceiptNumber'),
      amount: get('Amount') || payment.amount,
    });
  } else {
    await failPayment(payment, stk.ResultDesc || `M-Pesa result ${stk.ResultCode}`);
  }

  return { handled: true };
}
