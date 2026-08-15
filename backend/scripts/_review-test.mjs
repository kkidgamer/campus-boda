/**
 * Review API test — run against a live server with MongoDB connected:
 *   node scripts/_review-test.mjs
 *
 * Creates throwaway users + a completed ride, exercises the review
 * endpoints, then removes everything it created.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../src/config/environment.js';

const API = 'http://127.0.0.1:5000/api/v1';
const EMAIL_P = 'review-test-pass@campus.test';
const EMAIL_R = 'review-test-rider@campus.test';
const PASSWORD = 'Password@123';

let passId;
let riderId;

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

let passed = 0;
let failed = 0;
function check(name, ok, extra = '') {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function main() {
  await mongoose.connect(env.mongodbUri);
  const db = mongoose.connection.db;

  // --- seed throwaway data ------------------------------------------------
  const hash = await bcrypt.hash(PASSWORD, 10);
  const pass = await db.collection('users').insertOne({
    name: 'Review Test Passenger', email: EMAIL_P, phone: '+254700111222',
    password: hash, accountType: 'student', systemRole: 'passenger',
    status: 'active', verified: false, createdAt: new Date(), updatedAt: new Date(),
  });
  const rider = await db.collection('users').insertOne({
    name: 'Review Test Rider', email: EMAIL_R, phone: '+254700333444',
    password: hash, accountType: 'staff', systemRole: 'rider',
    status: 'active', verified: true, createdAt: new Date(), updatedAt: new Date(),
  });
  passId = pass.insertedId;
  riderId = rider.insertedId;
  await db.collection('riderprofiles').insertOne({
    userId: riderId, nationalId: '123', licenseNumber: 'LIC-TEST',
    verificationStatus: 'approved', rating: 0, totalTrips: 1, isOnline: true,
    createdAt: new Date(), updatedAt: new Date(),
  });
  const ride = await db.collection('rides').insertOne({
    passengerId: passId, riderId, pickup: { label: 'Library' },
    destination: { label: 'Hostels' }, estimatedFare: 150, finalFare: 150,
    status: 'COMPLETED', requestedAt: new Date(), completedAt: new Date(),
    createdAt: new Date(), updatedAt: new Date(),
  });
  const rideId = ride.insertedId;

  // --- logins --------------------------------------------------------------
  const loginP = await request('/auth/login', { method: 'POST', body: { email: EMAIL_P, password: PASSWORD } });
  const loginR = await request('/auth/login', { method: 'POST', body: { email: EMAIL_R, password: PASSWORD } });
  check('passenger can log in', loginP.status === 200);
  check('rider can log in', loginR.status === 200);
  const tokenP = loginP.data.access;
  const tokenR = loginR.data.access;

  // --- create review -------------------------------------------------------
  const created = await request('/reviews', {
    method: 'POST', token: tokenP,
    body: { rideId: rideId.toString(), rating: 5, comment: 'Smooth ride!' },
  });
  check('create review returns 201', created.status === 201, `got ${created.status}`);
  check('review persisted with rating 5', created.data?.review?.rating === 5);
  check('review has ride label', typeof created.data?.review?.rideLabel === 'string');

  const dup = await request('/reviews', {
    method: 'POST', token: tokenP, body: { rideId: rideId.toString(), rating: 3 },
  });
  check('duplicate review rejected (409)', dup.status === 409, `got ${dup.status}`);

  const badRating = await request('/reviews', {
    method: 'POST', token: tokenP, body: { rideId: rideId.toString(), rating: 9 },
  });
  check('out-of-range rating rejected (400)', badRating.status === 400, `got ${badRating.status}`);

  const nonCompleted = await db.collection('rides').insertOne({
    passengerId: passId, riderId, pickup: { label: 'A' }, destination: { label: 'B' },
    status: 'REQUESTED', requestedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  });
  const pending = await request('/reviews', {
    method: 'POST', token: tokenP, body: { rideId: nonCompleted.insertedId.toString(), rating: 4 },
  });
  check('non-completed ride rejected (400)', pending.status === 400, `got ${pending.status}`);

  // --- list ----------------------------------------------------------------
  const mine = await request('/reviews', { token: tokenP });
  check('passenger lists 1 review', mine.data?.count === 1, `got ${mine.data?.count}`);
  const aboutMe = await request('/reviews?about=me', { token: tokenR });
  check('rider sees review about them', aboutMe.data?.count === 1, `got ${aboutMe.data?.count}`);

  // --- rider rating updated ------------------------------------------------
  const prof = await db.collection('riderprofiles').findOne({ userId: riderId });
  check('rider profile rating recomputed', prof?.rating === 5, `got ${prof?.rating}`);

  console.log(`\n${passed} passed, ${failed} failed`);
}

try {
  await main();
} finally {
  // Cleanup: remove everything this script created.
  const db = mongoose.connection.db;
  if (db) {
    await db.collection('reviews').deleteMany({ $or: [{ passengerId: passId }, { riderId: riderId }] });
    await db.collection('rides').deleteMany({ $or: [{ passengerId: passId }, { riderId: riderId }] });
    await db.collection('riderprofiles').deleteMany({ userId: riderId });
    await db.collection('users').deleteMany({ _id: { $in: [passId, riderId] } });
    console.log('cleaned up test data');
  }
  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
}
