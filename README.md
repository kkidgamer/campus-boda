# Campus Boda 🏍️

**Campus Boda Transport Management and Ride-Hailing System**

Campus-wide boda (motorcycle taxi) transportation for **students, staff, lecturers, visitors,
contractors and other campus users** — not a student-only or bus service. See `project.md` for the
full product design and decision log.

## Architecture

```
Campus Boda
├── frontend/   React + Vite (Passenger / Rider / Admin experiences)
└── backend/    Node + Express + MongoDB (Mongoose)
```

### Backend

```
backend/
├── src/
│   ├── config/      environment.js, database.js
│   ├── controllers/ healthController.js, campusController.js
│   ├── middleware/  auth.js (JWT), roles.js, validation.js, errorHandler.js
│   ├── models/      User, Campus, RiderProfile, Motorcycle, PickupPoint,
│   │                Ride, Payment, Review, Complaint, Emergency,
│   │                Notification, FareConfiguration
│   ├── routes/      index.js (mounts /api/v1), healthRoutes.js, campusRoutes.js
│   ├── services/    fareService.js, matchingService.js, mpesaService.js, paymentService.js
│   ├── sockets/     index.js (Socket.IO + JWT auth + rooms), rideSocket.js (emitters)
│   ├── utils/       jwt.js, logger.js, validators.js, asyncHandler.js, geo.js
│   ├── app.js
│   └── server.js    HTTP server hosting both the REST API and Socket.IO
├── scripts/         seed.js
├── .env.example
└── package.json
```

- All endpoints are versioned: `/api/v1/...`
- The User model separates **accountType** (`student | staff | lecturer | visitor | contractor | other`)
  from **systemRole** (`passenger | rider | admin`) — passenger is the core transportation role.
- Ride references `passengerId` (not `studentId`), so any campus user can ride without redesign.

### Frontend

```
frontend/src/
├── api.js           axios client → http://127.0.0.1:5000/api/v1 (JWT refresh interceptor)
├── socket.js        Socket.IO client (JWT-authenticated, auto-refresh on token change)
├── hooks/           useSocketEvents (subscribe to ride events)
├── auth/            AuthContext, Login, Register, ProtectedRoute, RoleRoute, NavUser
├── pages/           HomePage, DashboardPage, RequestRidePage, RideHistoryPage,
│                    RiderDashboardPage, PaymentsPage, ComplaintsPage, ProfilePage, admin/
│                    (AdminLayout, Dashboard, Campuses, Users, Riders, Fares, Rides,
│                    Payments, Complaints)
├── App.jsx
└── main.jsx
```

## Getting started

### Backend

```bash
cd backend
cp .env.example .env      # set MONGODB_URI (local or Atlas), JWT_SECRET
npm install
npm run db                # start local MongoDB (mongod on :27017)
npm run seed              # default campus, pickup points, admin user (requires MongoDB)
npm run dev               # http://127.0.0.1:5000
```

The server boots even without MongoDB so the API is always reachable:

```
GET /api/v1/health
→ { "status": "ok", "service": "campus-boda-api", "db": "connected" | "disconnected" }
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://127.0.0.1:5173
```

## Progress vs. the 15-phase plan

| Phase | Status |
| --- | --- |
| 1. Requirements | 🟡 Concept defined in `project.md`; formal doc pending |
| 2. Architecture | 🟢 Express + MongoDB, passenger-centered data model |
| 3. Backend foundation | 🟢 Foundation + all 12 models + `/api/v1` + health |
| 4. Authentication | 🟢 Register, login, refresh tokens, protected routes, role checks |
| 5. Passenger management | 🟢 Passenger dashboard, profile editing, password change, emergency contacts |
| 6. Rider verification | 🟢 Admin registers riders (account + documents + motorcycle); approve/reject/suspend |
| 7. Campus locations | 🟢 Campus + pickup point models + full admin CRUD |
| 8. Boda booking | 🟢 Request → accept → arrive → start → complete; cancel; rider matching |
| 9. Fare engine | 🟢 Quote endpoint + breakdown, admin-managed rates, live quote in request UI |
| 10. Real-time (Socket.IO) | 🟢 Ride matching + status updates pushed live to riders & passengers |
| 11. GPS | 🔴 |
| 12. M-Pesa payments | 🟢 Daraja STK push (simulation mode default; sandbox/production via `.env`) |
| 13. Safety (SOS) | 🟡 Complaint filing (passenger) + handling (admin) live; Emergency/SOS pending |
| 14. Admin/analytics | 🟡 Admin panel (dashboard stats, campuses, users, rides, payments, complaints); analytics pending |
| 15. Mobile | 🔴 |

## Real-time (Socket.IO)

Ride matching and status updates are pushed live over WebSocket (Socket.IO on the same port as the
API). Every socket authenticates with the JWT access token (`auth.token`); invalid tokens are
rejected at the handshake.

Events:

| Event | Sent to | When |
| --- | --- | --- |
| `ride:new` | Verified + online riders (per-ride candidates) | Passenger requests a ride |
| `ride:update` | Passenger (and assigned rider) | Accept → arrive → start → complete |
| `ride:taken` | All connected riders | A ride was accepted or cancelled (drop it from lists) |
| `ride:cancelled` | Passenger + assigned rider | Passenger cancels a ride |

Riders are joined to a `user:<id>` room (targeted events) and a `riders` room (broadcasts). The
Rider Dashboard refreshes silently on `ride:new`/`ride:taken` and tracks the active ride on
`ride:update`; the My Trips page reloads on `ride:update`/`ride:cancelled`. The real-time flow is
covered by `backend/scripts/_socket-test.mjs` (14 assertions, run against a live server).

## M-Pesa

Payments use the Safaricom Daraja API (Lipa Na M-Pesa / STK Push).

- **`MPESA_ENV=simulation`** (default) runs the whole flow locally without credentials — STK push
  is faked and payments are confirmed via `POST /payments/:id/simulate-confirm` or a crafted callback.
- **`MPESA_ENV=sandbox`** uses real Daraja calls — set `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
  `MPESA_SHORTCODE`, `MPESA_PASSKEY` in `backend/.env` (from the
  [Safaricom developer portal](https://developer.safaricom.co.ke/)). The callback URL must be
  publicly reachable (e.g. ngrok) so Safaricom can POST the STK result to
  `/api/v1/payments/mpesa/callback`.
- The payment lifecycle: `pending` → `paid` (stores `mpesaReceipt`) or `failed`. One payment per ride.

## Notes

- The original Django + SQLite bus-oriented prototype was removed (still in git history under the
  first commit). Nothing was built on top of the Bus → Route → Schedule → Booking model.
- Registration collects `name`, `email`, `phone`, `accountType` and `campus` — no separate
  "student registration number" flows in v1 (see `project.md`).
- Seeded admin: `admin@campusboda.test` / `Admin@123` (run `npm run seed` first).

## API

Versioned under `/api/v1`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | — | Service + DB status |
| GET | `/campuses` | — | Active campuses |
| GET | `/campuses/:id/pickup-points` | — | Pickup points for a campus |
| POST | `/auth/register` | — | Create account (`name`, `email`, `phone`, `password`, `accountType?`, `campusId?`) |
| POST | `/auth/login` | — | Returns `{ access, refresh, user }` |
| POST | `/auth/refresh` | — | Exchange refresh token for a new pair |
| GET | `/auth/profile` | Bearer | Current user |
| POST | `/auth/logout` | — | Stateless logout (client discards tokens) |
| GET | `/users/me` | Bearer | Own profile incl. emergency contacts + campus name |
| PUT | `/users/me` | Bearer | Update own profile (`name`, `phone`, `accountType`, `campusId`, `profilePhoto`) |
| PATCH | `/users/me/password` | Bearer | Change password (`currentPassword`, `newPassword`) |
| GET | `/users/me/emergency-contacts` | Bearer | Own emergency contacts |
| POST | `/users/me/emergency-contacts` | Bearer | Add contact (`name`, `phone`, `relationship?`) |
| PUT | `/users/me/emergency-contacts/:contactId` | Bearer | Update contact |
| DELETE | `/users/me/emergency-contacts/:contactId` | Bearer | Delete contact |
| POST | `/riders` | Bearer | Update own rider documents (`nationalId`, `licenseNumber`) — riders are registered by admins via `/admin/riders` |
| GET | `/riders/me` | Bearer | Own rider profile + motorcycles |
| PUT | `/riders/me` | Bearer | Update own rider profile (triggers re-verification) |
| PATCH | `/riders/me/status` | Bearer | Toggle online/offline (`isOnline`) |
| GET | `/riders/:id` | — | Public rider profile (verified info) |
| POST | `/motorcycles` | Bearer | Add motorcycle (`registrationNumber` unique) |
| GET | `/motorcycles/me` | Bearer | Own motorcycles |
| PUT `/ DELETE` | `/motorcycles/:id` | Bearer | Update/delete own motorcycle |
| GET | `/admin/stats` | Admin | Dashboard summary counts + revenue |
| GET | `/admin/riders?status=` | Admin | List riders (+ their motorcycles) |
| POST | `/admin/riders` | Admin | Register a rider (`name`, `email`, `phone`, `password`, `nationalId?`, `licenseNumber?`, `motorcycle?`) — creates account + profile + optional motorcycle |
| POST | `/admin/riders/:userId/motorcycles` | Admin | Add a motorcycle to a rider (`registrationNumber` required) |
| DELETE | `/admin/riders/:userId/motorcycles/:motorcycleId` | Admin | Remove a motorcycle |
| PATCH | `/admin/riders/:userId/verify` | Admin | `approved` \| `rejected` \| `suspended` |
| GET | `/admin/users?status=&systemRole=&accountType=&q=` | Admin | All users (search by name/email/phone) |
| PATCH | `/admin/users/:id/status` | Admin | Suspend / activate / deactivate a user |
| GET | `/admin/complaints?status=&category=` | Admin | All complaints |
| PATCH | `/admin/complaints/:id` | Admin | Update complaint status / resolution |
| GET | `/admin/campuses` | Admin | All campuses (any status), `?status=` filter |
| GET | `/admin/campuses/:id` | Admin | Single campus |
| POST | `/admin/campuses` | Admin | Create campus (`name` required; `institution`, `address`, `latitude`, `longitude`, `status`) |
| PUT | `/admin/campuses/:id` | Admin | Update campus (partial) |
| DELETE | `/admin/campuses/:id` | Admin | Deactivate campus (soft delete — rides/users/fares keep their reference) |
| GET | `/admin/pickup-points?campusId=&status=` | Admin | All pickup points |
| GET | `/admin/pickup-points/:id` | Admin | Single pickup point |
| POST | `/admin/pickup-points` | Admin | Create pickup point (`campusId`, `name` required) |
| PUT | `/admin/pickup-points/:id` | Admin | Update pickup point (partial) |
| DELETE | `/admin/pickup-points/:id` | Admin | Delete pickup point |
| POST | `/rides` | Bearer | Request a ride (`campusId`, `pickup`, `destination`) |
| GET | `/rides` | Bearer | Own rides (passenger or rider), `?status=` filter |
| GET | `/rides/available` | Rider | Ride requests awaiting a rider (verified + online) |
| GET | `/rides/active` | Rider | Current ACCEPTED/ARRIVING/STARTED ride |
| GET | `/rides/:id` | Bearer | Ride detail (passenger / assigned rider / admin) |
| POST | `/rides/:id/accept` | Rider | Accept a ride (REQUESTED → ACCEPTED) |
| POST | `/rides/:id/arrive` | Rider | ACCEPTED → ARRIVING |
| POST | `/rides/:id/start` | Rider | ACCEPTED/ARRIVING → STARTED |
| POST | `/rides/:id/complete` | Rider | STARTED → COMPLETED (sets `finalFare`) |
| POST | `/rides/:id/cancel` | Passenger | REQUESTED/SEARCHING/ACCEPTED → CANCELLED |
| GET | `/fares/quote?campusId=&distanceKm=` | — | Fare estimate + transparent breakdown |
| GET | `/fares/campus/:campusId` | — | Active fare configuration for a campus |
| GET | `/admin/fares` | Admin | All fare configurations |
| POST | `/admin/fares` | Admin | Create a campus fare configuration (`campusId` required) |
| PUT | `/admin/fares/:campusId` | Admin | Update base/per-km/min/peak rates |
| POST | `/payments` | Bearer | Initiate M-Pesa payment for a completed ride (`rideId`, `phone`) |
| GET | `/payments` | Bearer | Own payments, `?status=` filter |
| POST | `/payments/mpesa/callback` | — | M-Pesa STK push webhook (public) |
| POST | `/payments/:id/simulate-confirm` | Bearer | Simulation-only: confirm a pending payment |
| POST | `/complaints` | Bearer | File a complaint (`description` required; `rideId?`, `category?`) |
| GET | `/complaints` | Bearer | Own complaints, `?status=` filter |
| GET | `/complaints/:id` | Bearer | Own complaint detail |
| POST | `/reviews` | Bearer | Rate a completed ride (`rideId`, `rating` 1–5, `comment?`) |
| GET | `/reviews` | Bearer | Reviews the user wrote; `?about=me` for reviews about the user (rider) |
| GET | `/reviews/:id` | Bearer | Review detail (reviewer / rated rider / admin) |
| GET | `/admin/payments?status=` | Admin | All payments |
| GET | `/admin/rides?status=` | Admin | List all rides |
