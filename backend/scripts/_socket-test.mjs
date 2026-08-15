/**
 * End-to-end Socket.IO verification for real-time ride matching.
 *
 * Requires the API server to be running (npm run dev) and mongod up.
 * Uses socket.io-client to connect as riders + passenger and drives the
 * REST API to trigger ride:new / ride:update / ride:taken / ride:cancelled.
 */
import { io } from 'socket.io-client';
import axios from 'axios';

const BASE = 'http://127.0.0.1:5000/api/v1';
const SOCKET_URL = 'http://127.0.0.1:5000';

let passed = 0;
let failed = 0;
function ok(cond, label) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

async function login(email, password) {
  const res = await axios.post(`${BASE}/auth/login`, { email, password });
  return res.data;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: 4000,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

function waitFor(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for '${event}' on ${socket.id}`));
    }, timeoutMs);
    function handler(payload) {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }
    socket.on(event, handler);
  });
}

async function main() {
  console.log('\n=== Socket.IO real-time matching tests ===\n');

  // ---- Auth guards ----
  console.log('1. Socket auth guards');
  try {
    await connect('garbage-token');
    ok(false, 'garbage token rejected');
  } catch {
    ok(true, 'garbage token rejected (connect_error)');
  }
  try {
    await connect('');
    ok(false, 'missing token rejected');
  } catch {
    ok(true, 'missing token rejected (connect_error)');
  }

  // ---- Setup ----
  const mary = await login('mary@campus.edu', 'password123'); // rider
  const sam = await login('sam@campus.edu', 'password123'); // rider
  const pete = await login('pete@campus.edu', 'password123'); // passenger

  // Make sure both riders are online so they're candidates.
  await axios.patch(
    `${BASE}/riders/me/status`,
    { isOnline: true },
    { headers: authHeaders(mary.access) }
  );
  await axios.patch(
    `${BASE}/riders/me/status`,
    { isOnline: true },
    { headers: authHeaders(sam.access) }
  );

  const marySocket = await connect(mary.access);
  const samSocket = await connect(sam.access);
  const peteSocket = await connect(pete.access);
  console.log('   connected: mary (rider), sam (rider), pete (passenger)');

  const campuses = await axios.get(`${BASE}/campuses`);
  const campusId = campuses.data.results[0]._id;

  const requestRide = () =>
    axios.post(
      `${BASE}/rides`,
      {
        campusId,
        pickup: { label: 'Main Gate' },
        destination: { label: 'Library' },
      },
      { headers: authHeaders(pete.access) }
    );

  // ---- Ride 1: request -> accept -> arrive -> start -> complete ----
  console.log('\n2. Passenger requests a ride -> both riders pinged instantly');
  const mNew = waitFor(marySocket, 'ride:new');
  const sNew = waitFor(samSocket, 'ride:new');
  const created = await requestRide();
  const rideId = created.data.ride.id;
  ok(!!rideId, `ride created (id ${rideId})`);
  const [maryNew, samNew] = await Promise.all([mNew, sNew]);
  ok(maryNew.ride.id === rideId, 'mary received ride:new for the new ride');
  ok(samNew.ride.id === rideId, 'sam received ride:new for the new ride');
  ok(maryNew.fareDetails?.estimatedFare > 0, 'ride:new carries fare details');

  console.log('\n3. Mary accepts -> passenger updated live, other rider notified');
  const pUpdate = waitFor(peteSocket, 'ride:update');
  const taken = waitFor(samSocket, 'ride:taken');
  await axios.post(
    `${BASE}/rides/${rideId}/accept`,
    {},
    { headers: authHeaders(mary.access) }
  );
  const [accepted, takenEvt] = await Promise.all([pUpdate, taken]);
  ok(accepted.ride.id === rideId && accepted.ride.status === 'ACCEPTED', 'passenger got ride:update ACCEPTED');
  ok(takenEvt.rideId === rideId, 'sam got ride:taken (drops it from his list)');

  console.log('\n4. Arrive / start / complete -> passenger updated each step');
  const arrP = waitFor(peteSocket, 'ride:update');
  await axios.post(`${BASE}/rides/${rideId}/arrive`, {}, { headers: authHeaders(mary.access) });
  ok((await arrP).ride.status === 'ARRIVING', 'passenger got ride:update ARRIVING');

  const startP = waitFor(peteSocket, 'ride:update');
  await axios.post(`${BASE}/rides/${rideId}/start`, {}, { headers: authHeaders(mary.access) });
  ok((await startP).ride.status === 'STARTED', 'passenger got ride:update STARTED');

  const compP = waitFor(peteSocket, 'ride:update');
  await axios.post(
    `${BASE}/rides/${rideId}/complete`,
    { finalFare: 180 },
    { headers: authHeaders(mary.access) }
  );
  const completed = await compP;
  ok(completed.ride.status === 'COMPLETED' && completed.ride.finalFare === 180, 'passenger got ride:update COMPLETED with finalFare');

  // ---- Ride 2: request -> cancel ----
  console.log('\n5. Passenger cancels a fresh request -> riders notified');
  const cancelNew = waitFor(marySocket, 'ride:new');
  const created2 = await requestRide();
  const ride2Id = created2.data.ride.id;
  await cancelNew;
  ok(true, 'mary got ride:new for ride 2');

  const cancelledP = waitFor(peteSocket, 'ride:cancelled');
  const removed = waitFor(marySocket, 'ride:taken');
  await axios.post(
    `${BASE}/rides/${ride2Id}/cancel`,
    {},
    { headers: authHeaders(pete.access) }
  );
  const [pCan, removedEvt] = await Promise.all([cancelledP, removed]);
  ok(pCan.ride.id === ride2Id && pCan.ride.status === 'CANCELLED', 'passenger got ride:cancelled');
  ok(removedEvt.rideId === ride2Id, 'riders got ride:taken broadcast (drop cancelled ride)');

  // ---- Cleanup ----
  marySocket.disconnect();
  samSocket.disconnect();
  peteSocket.disconnect();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
