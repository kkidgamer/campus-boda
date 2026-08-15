import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Ride from '../models/Ride.js';
import asyncHandler from '../utils/asyncHandler.js';
import { normalizePhone, isSimulationMode } from '../services/mpesaService.js';
import {
  initiatePayment,
  handleMpesaCallback,
  confirmPayment,
} from '../services/paymentService.js';

function serializePayment(payment) {
  const p = payment.toJSON();
  return {
    ...p,
    id: p._id,
    rideFrom: payment.rideId?.pickup?.label,
    rideTo: payment.rideId?.destination?.label,
  };
}

/**
 * Initiate M-Pesa payment for a completed ride.
 * Body: { rideId, phone, amount? }
 */
export const initiate = asyncHandler(async (req, res) => {
  const { rideId, phone, amount } = req.body;

  if (!rideId || !mongoose.isValidObjectId(rideId)) {
    return res.status(400).json({ error: { message: 'A valid rideId is required' } });
  }
  if (!phone) {
    return res.status(400).json({ error: { message: 'M-Pesa phone number is required' } });
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return res.status(404).json({ error: { message: 'Ride not found' } });
  }
  if (ride.passengerId.toString() !== req.user.id && req.user.systemRole !== 'admin') {
    return res.status(403).json({ error: { message: 'You can only pay for your own rides' } });
  }
  if (ride.status !== 'COMPLETED') {
    return res.status(400).json({ error: { message: `Ride is ${ride.status} — only completed rides can be paid` } });
  }

  const result = await initiatePayment({
    ride,
    passengerId: req.user.id,
    amount: Number(amount) || ride.finalFare || ride.estimatedFare,
    phone: normalizePhone(phone),
  });

  if (result.error) {
    return res.status(result.error.status).json({ error: { message: result.error.message } });
  }

  return res.status(201).json({
    message: result.simulated
      ? 'Payment initiated (M-Pesa simulation mode)'
      : 'M-Pesa STK push sent — approve the prompt on your phone',
    payment: serializePayment(result.payment),
    simulated: result.simulated,
  });
});

/** The authenticated user's payments (as passenger or rider). */
export const listMyPayments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {
    $or: [{ passengerId: req.user.id }, { riderId: req.user.id }],
  };
  if (status) filter.status = status;

  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .populate('rideId', 'pickup destination estimatedFare finalFare status');
  return res.json({ results: payments.map(serializePayment), count: payments.length });
});

/** Payment detail — passenger, assigned rider, or admin. */
export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('rideId', 'pickup destination estimatedFare finalFare status')
    .populate('passengerId', 'name')
    .populate('riderId', 'name');
  if (!payment) {
    return res.status(404).json({ error: { message: 'Payment not found' } });
  }
  const isActor =
    payment.passengerId?._id?.toString() === req.user.id ||
    (payment.riderId && payment.riderId._id.toString() === req.user.id);
  if (!isActor && req.user.systemRole !== 'admin') {
    return res.status(403).json({ error: { message: 'You cannot view this payment' } });
  }
  return res.json({ payment: serializePayment(payment) });
});

/**
 * M-Pesa STK push callback (public webhook — no auth; Safaricom calls this).
 * Always answers 200 so M-Pesa doesn't retry, after confirming/failing.
 */
export const mpesaCallback = asyncHandler(async (req, res) => {
  await handleMpesaCallback(req.body);
  return res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

/**
 * Simulation-only: stand in for the passenger approving the STK prompt.
 * Marks the payment paid with a generated M-Pesa receipt number.
 */
export const simulateConfirm = asyncHandler(async (req, res) => {
  if (!isSimulationMode()) {
    return res.status(404).json({ error: { message: 'Not available outside simulation mode' } });
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: { message: 'Payment not found' } });
  }
  if (payment.passengerId.toString() !== req.user.id && req.user.systemRole !== 'admin') {
    return res.status(403).json({ error: { message: 'You can only confirm your own payments' } });
  }
  if (payment.status !== 'pending') {
    return res.status(409).json({ error: { message: `Payment is already ${payment.status}` } });
  }

  await confirmPayment(payment);
  return res.json({ message: 'Payment confirmed (simulated)', payment: serializePayment(payment) });
});
