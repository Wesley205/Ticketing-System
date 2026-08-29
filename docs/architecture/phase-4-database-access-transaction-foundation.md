# Phase 4: Database Access And Transaction Foundation

## Implemented

- Added `backend/src/database/pool.js`.
- Added `backend/src/database/query.js`.
- Added `backend/src/database/transaction.js`.
- Added `backend/src/database/errors.js`.
- Kept `backend/src/config/db.js` as a compatibility export for the shared pool.
- Kept `backend/src/utils/transactions.js` as a compatibility export for `withTransaction`.

## Database Primitives

### Pool

`createPool()` uses centralized environment config for:

- host
- port
- database
- user
- password
- SSL
- maximum pool size
- idle timeout
- connection timeout

`shutdownPool()` closes a supplied pool or the shared pool.

### Query Helper

`query()` wraps a pool or client query and supports:

- successful query pass-through
- query timing logs in development only
- query summaries without SQL parameter values
- database failure logs without sensitive parameters

### Transaction Helper

`withTransaction()` follows:

```text
BEGIN
execute callback
COMMIT
on error:
  ROLLBACK
always:
  release client
```

Rollback failures are logged through the central logger and the original transaction error is rethrown.

### Error Mapping

`mapDatabaseError()` maps:

- duplicate key `23505`
- foreign key `23503`
- not-null `23502`
- check constraint `23514`
- generic PostgreSQL SQLSTATE-style errors

## Boundaries

This phase does not refactor business workflows or route SQL. Existing modules can continue using `config/db.js` and `utils/transactions.js` until feature-level refactors are scheduled.
