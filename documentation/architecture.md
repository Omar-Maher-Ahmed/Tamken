# Architecture Overview

The application is a **modular monolith**: one NestJS deployment and one
PostgreSQL database. Modules communicate through explicitly exported services
or entities, not HTTP, queues, or distributed events.

## Module dependency map

```text
Auth ────────────────┐
Providers ──> Discovery
     │               │
     └──> Jobs <─────┤
            │  │     │
            │  ├──> Messaging
            │  ├──> Reviews ──> Providers (rating aggregate)
            │  └──> Verification ──> Providers / Auth
```

- `Auth` owns users, JWT sessions and roles. Public registration can create
  only customers or providers.
- `Providers` owns provider profiles. `Discovery` is a query module over
  active provider profiles; it owns no table. Geographic coordinates are kept
  as JSON during the MVP and can move to a PostGIS geography column in a
  dedicated migration when radius search is introduced.
- `Jobs` owns the service-request lifecycle and is the authorization source
  for messaging and reviews.
- `Messaging` stores messages by job after participant validation.
- `Reviews` permits one customer review for a completed job and recalculates
  the provider rating.
- `Verification` records provider documents and lets admins approve/reject.

## Database relationships

```text
users 1──0..1 provider_profiles
users 1──* service_requests (customer)
provider_profiles 1──* service_requests
service_requests 1──* messages
service_requests 1──0..1 reviews
users 1──* reviews
provider_profiles 1──* reviews, verification_documents
users 1──* refresh_tokens
```

Foreign keys and unique constraints protect relationships; service-layer
checks enforce ownership and state-dependent rules. Provider-list queries are
indexed by active/category/rating; job/message/review foreign keys should also
be indexed in a production migration.

## HTTP API

| Module | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Providers | `GET /providers`, `GET /providers/:id`, `GET/PATCH /users/me`, `POST/PATCH /users/me/provider-profile` |
| Discovery | `GET /search` |
| Jobs | `POST /providers/:id/request`, `GET /requests`, `GET /requests/:id`, `PATCH /requests/:id/status` |
| Messaging | `GET /messages/:jobId`; Socket.IO namespace `/chat` |
| Reviews | `POST /reviews`, `GET /reviews/:providerId` |
| Verification | `POST /verification/submit`, `GET /verification/status`, `GET /verification/pending`, `PATCH /verification/:id/review` |

All successful HTTP responses are wrapped as `{ success: true, data }`; errors
are emitted by the global exception filter.

## Authentication and authorization

1. Login issues a short-lived signed JWT access token and an opaque refresh
   token. Only a bcrypt hash of the refresh token secret is stored.
2. Refresh atomically revokes the presented record then issues a replacement.
3. `JwtAuthGuard` is global; only `@Public()` routes bypass it.
4. `RolesGuard` applies `@Roles()` restrictions. Services still perform
   resource ownership checks for every ID-based operation.

## Job transitions

```text
pending ──> accepted ──> in_progress ──> completed
   │            │              │
   └────────────┴──────────────┴──> cancelled
```

Customers may cancel only their own jobs. Assigned providers may accept,
advance, complete, or cancel according to the state machine. Admins can make
only valid state transitions; they do not bypass the state machine.

## Security considerations

- Never trust a valid JWT alone for resource access: verify job participation,
  provider-profile ownership, and review ownership in services.
- Public registration cannot choose the admin role.
- Do not expose password hashes or raw refresh tokens.
- Validate request bodies, query strings, and UUID route parameters.
- Keep generic invalid-credential errors and use rate limiting on auth routes.
- Socket connections authenticate in the handshake; room joins and sends are
  authorized against the job participants before persistence or broadcast.
