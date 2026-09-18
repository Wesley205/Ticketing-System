# LocalFinda backend memory audit — review proposal

## 1. Task and scope

Audit the confirmed backend at `C:/Users/DELL/VS Code Projects/localfinda_server` for V8 retention, client/socket lifecycles, buffering and oversized queries. Preserve the supplied LocalFinda context and constraints; the explicit Node.js backend task determines which platform-specific constraints apply. Preserve auth behavior, feature boundaries, existing dependency injection, API contracts, secret handling and unrelated changes. Do not apply backend changes, run static analysis, alter environment/deployment files, or contact production.

Audit date: 2026-09-17. Local HEAD: `45b859cda8a2ed264d07bf3a2537ff09a037c981`; backend worktree was clean when inspected. The originally supplied `_server` directory was absent; the user confirmed the directory above. No backend files were modified. This report and the middleware example reside in the current writable workspace, separately from that repository.

Method: repository-wide text searches across application source, scripts and supporting files, followed by manual reads of matching implementations, callers and DI registrations. Generated bundles and dependencies were excluded from the first-party search; the installed Supabase auth implementation was inspected separately. No application startup, production queries, tests, build, lint or automated static analysis were run. Environment values were not read. This is a source audit, not a production heap-profile diagnosis or a guarantee that every runtime retention path has been discovered.

All paths below are relative to the confirmed backend root. Line numbers refer to the inspected checkout. `S/<module>/...` means `libs/services/<module>/src/lib/...`; `H/<module>/...` means `libs/shared/<module>/src/...`. These prefixes are used only in the large query inventory; principal findings use full paths.

## 2. Diagnostic report

### Finding and incident conclusion

**There are confirmed unbounded retention paths and a confirmed background-concurrency bug. There is insufficient runtime evidence to name one as the cause of the Render incident.** Prioritize the location/category caches and the job/retry combination. The source does not support claiming that each login creates a database connection or that `persistSession` alone explains 1.5 GB of retained heap.

The strongest findings are:

1. Three singleton caches retain arbitrary location/category keys with no hard bound. Location TTL only removes a key when that same key is read again.
2. The job drain guard is incorrectly cleared by an overlapping invocation, allowing concurrent drains. Scheduler and call-heartbeat intervals also allow overlap.
3. Retry timeouts stop waiting without cancelling the underlying operation. Slow upstream work can accumulate, including after callers receive errors.
4. Experience plugin and approval registries retain dynamic records permanently. Other in-memory stores are dormant or lower-confidence incident contributors.
5. Global 50 MB bodies, raw-body copies, buffered uploads/PDFs and oversized query hydration multiply the cost of concurrent work.

`heapUsedRatio: 0.931` has no established denominator in the provided evidence. Neither `heapUsedRatio` nor `resource_exhaustion` was found in first-party source. If the ratio is `heapUsed / heapTotal`, it measures use of V8's currently allocated heap, not 93% of the configured heap limit or Render RAM. Track `heapUsed / heap_size_limit` and RSS separately. Buffer backing stores predominantly appear in `external`/`arrayBuffers`, not just `heapUsed`; `arrayBuffers` is included in `external`, so do not add them together. Increasing old-space does not cap RSS. These distinctions follow [Node memoryUsage documentation](https://nodejs.org/api/process.html#processmemoryusage).

Low CPU is compatible with retained caches, idle timers, waiting I/O, or a misleadingly sampled metric; it does not prove any one of them. `/health` at `server.ts:160` returns a static response and does not query Supabase. Its failure can be a process-wide availability symptom, rather than a leak in that handler. Confirm the Render instance RAM limit, deployed commit/Node version, absolute memory measurements and OOM/restart logs before assigning incident causality.

### A. Confirmed retained-state defects

| Priority | File and line | Evidence, GC mechanism and scope |
|---|---|---|
| P1 | `libs/services/location/src/lib/application/services/LocationCache.ts:30,61,77` | Singleton `store` receives every distinct key. Expiry is checked only on a read of that key. A one-off location search therefore remains reachable through the DI container → cache → Map forever. TTL metadata does not remove a strong reference. Singleton registration: `libs/services/location/src/lib/infrastructure/awilix/registerLocationModule.ts:25`. |
| P1 | `libs/services/experience/src/lib/domain/services/CategoryExperienceResolverService.ts:26,66,85,104,125` | Generated profiles from caller-supplied categories/profile IDs/metadata are inserted into a singleton Map with no eviction. Values retain their generated metadata and nested profile structure. Registration is at `libs/services/experience/src/lib/infrastructure/awilix/registerExperienceModule.ts:65`. |
| P1 | `libs/services/experience/src/lib/domain/services/CategoryArchetypeResolverService.ts:31,100,110,121` | Generated archetypes are permanently cached, including arbitrary direct profile keys. Singleton registration at `registerExperienceModule.ts:63`. The Map, not a failure of GC, keeps them alive. |
| P2 | `libs/services/experience/src/lib/application/services/ExperiencePluginRegistryService.ts:98,133,158` | `registerPlugin` permanently stores each new ID, including caller metadata. Active controller call at `libs/services/experience/src/lib/api/controllers/ExperienceController.ts:1077`. This is authoritative state, so blindly evicting it would lose behavior/data. |
| P2 | `libs/services/experience/src/lib/application/services/ExperienceMarketplaceService.ts:29,93,126` | Approvals store full package objects indefinitely; approvals for removed packages are never pruned. `buildPackages` also copies all approval values on each call. Active controller call at `ExperienceController.ts:995`. Persist approval facts; do not use LRU to erase approved status. |
| Conditional | `libs/services/experience/src/lib/infrastructure/repositories/InMemoryVerticalRepository.ts:5,6,11,12`; `libs/services/experience/src/lib/domain/entities/VerticalDefinition.ts:65,229,256` | Singleton repository retains every saved aggregate and slug. `pullEvents()` copies rather than drains its event array. A repeatedly mutated retained vertical can retain every event. Production registration exists, but no active HTTP writer was established in this audit. Treat as a latent persistence/retention defect, not a measured incident cause. |
| Conditional | `libs/services/featureflags/src/lib/infrastructure/repositories/InMemoryFeatureFlagRepository.ts:10,11,14,26` | Permanent definition and per-scope override Maps, no delete/cap. Production uses this repository, but the observed bootstrap seeds a finite set of flags; growing override traffic was not established. Never evict authorization/business flags to reclaim memory. |

**Dormant or bounded-by-current-use findings:**

- `libs/services/identity/src/lib/application/services/IdentityOperationFramework.ts:26,40,55,63,90,91,95,99`: reservation/lock Maps have no sweeper; raw timing samples and metric keys have no cap. These are registered as lazy singletons at `registerIdentityModule.ts:243–251`, but searches found no production consumers of those registrations or timing calls. They are real latent risks, not evidence that login currently fills the timing array.
- `libs/shared/core/src/infrastructure/TracingProvider.ts:33,35`: unbounded in-memory span exporter exists, but production registers `NoopSpanExporter` at `registerCoreModule.ts:21`. Do not label it the production leak.
- `libs/shared/core/src/infrastructure/MetricsCollector.ts:49–51,64,79,97,114`: series are unbounded by distinct metric/label combinations, but histograms aggregate count/sum/min/max rather than append observations. Most inspected labels are fixed operation names; dynamic job types and future user-controlled labels require a cardinality budget. `snapshot()` at line 128 also copies the complete structure.
- `libs/shared/core/src/infrastructure/CircuitBreakerFactory.ts:34,42`: registry has no cap, but inspected names are mostly fixed operations. Do not evict open breakers randomly; register/validate allowed operation names instead.
- `libs/services/jobs/src/lib/infrastructure/repositories/InMemoryJobScheduleRepository.ts:4,7,19`: persistent Map, currently populated by a finite bootstrap schedule set. Keep schedule IDs stable and reject uncontrolled additions.
- `InMemoryJobQueueRepository.ts`, `InMemoryWorkflowRepository.ts` and `InMemoryIdentityRepository.ts` contain growing stores, but the production registrations inspected use Supabase repositories instead. Keep these test helpers out of production; they are not established incident roots.
- `CategoryCommercePackService.ts:73,82,295` only stores seeded packs and a fixed fallback in inspected code; unlike the category profile/archetype caches, arbitrary input does not create arbitrary stored packs.

### B. Background work and cancellation

| Priority | File and line | Finding |
|---|---|---|
| P1 | `server.ts:383–399` | `if (__draining) return` is inside `try`. An overlapping invocation still executes `finally`, resetting another invocation's guard. Subsequent ticks can start more drains. Pending callbacks/promises retain job payloads, async context, results and downstream network state. |
| P1 | `server.ts:374,408` | Scheduler and heartbeat `setInterval(async ...)` callbacks have no non-overlap guard. An interval does not await its prior callback. Slow I/O can create a growing backlog. |
| P1 | `libs/shared/core/src/infrastructure/RetryPolicyFactory.ts:97–107,138,149` | `Promise.race` rejects on timeout but leaves the operation running, then may retry it. Active I/O and callbacks can retain the old operation's state. An unresolved Promise alone is not necessarily a GC root; the live transport/timer/caller references are what matter. |
| P1/P2 | `libs/services/jobs/src/lib/infrastructure/repositories/SupabaseJobRepository.ts:29–57` | Select-then-update job claim does not check whether the conditional UPDATE changed a row. A lost claim can still return the job. The poller bug increases exposure to duplicate processing and multiplied allocations. Use returned rows as a minimum correction; durable atomic claiming is the long-term fix. |
| P2 | `libs/services/search/src/lib/infrastructure/telemetry/SearchEventTelemetryHandler.ts:15,201–245` | Each search schedules a 60-second timer capturing its event and async context. There is cleanup in `finally`, so this is not automatically permanent retention, but there is no cap on pending timers or their DB calls. A hung lookup delays cleanup. Timer replacement during an executing old callback can let old cleanup remove the newer Map entry. |

`CircuitBreakerFactory.ts:79–90` only applies its timeout through the retry path. When no retry policy is supplied, the operation executes directly; specifying `timeoutMs` there is not itself a transport timeout.

### C. Complete Supabase construction-site inventory

No first-party `new Pool()` or PostgreSQL `new Client()` construction was found. The `new Client` in `libs/services/notification/src/lib/infrastructure/push/OneSignalClientFactory.ts:18` is OneSignal, not pg. Do not add a PostgreSQL pool merely to fix this application: its inspected database repositories use the Supabase HTTP API.

| File and construction line | Lifetime and disposition |
|---|---|
| `libs/shared/config/src/lib/container.ts:46` | Root singleton, missing all explicit server auth options. Keep one authoritative database registration. |
| `libs/services/auth/src/lib/infrastructure/awilix/registerAuthModule.ts:138` | Re-registers the same `supabase` singleton name, missing options. Remove duplicate registration after centralizing it. |
| `libs/services/user/src/lib/infrastructure/awilix/registerUserModule.ts:97` | Re-registers the same singleton name again, missing options. Remove duplicate registration. |
| `libs/shared/messaging/src/lib/registerQueueClient.ts:18` | Also overrides `supabase` if called. Queue is singleton; no production caller was found. Remove the override, use existing injected client. |
| `libs/services/auth/src/lib/infrastructure/prisma/SupabasePrismaAdapter.ts:21` | Constructor-owned auth client, missing options. Adapter is registered `.scoped()` at `registerAuthModule.ts:127`; root-resolved auth routes/mediator mean per-request construction is **not established**. Repeated scopes would create timer-retained clients. This client changes user auth state, so do not replace it with the shared admin database client. |
| `libs/services/media/src/lib/infrastructure/services/SupabaseStorageService.ts:21` | Constructor creates client; service registered singleton. Fixed duplication, not demonstrated per-request growth. Inject shared admin client. |
| `libs/services/rule-engine/src/lib/infrastructure/repositories/SupabaseRuleRepository.ts:15` | Singleton repository-owned client; missing options. Inject shared client. |
| `libs/services/rule-engine/src/lib/infrastructure/repositories/SupabasePolicyRuleRepository.ts:18` | Same. |
| `libs/services/pricing/src/lib/infrastructure/repositories/SupabasePricingSnapshotRepository.ts:22` | CLASSIC-injected singleton creates client; missing options. Inject client as constructor parameter. |
| `libs/services/pricing/src/lib/infrastructure/delivery/SupabaseDeliveryPricingPolicyRepository.ts:194` | Fallback factory. Normal production DI supplies `supabase`, so fallback is not the normal path. Require injection or use the central factory for isolated callers. |
| `libs/services/identity/src/lib/infrastructure/awilix/registerIdentityModule.ts:62` | Factory serves two singleton registrations, `identityAuthSupabase` and `identityAdminSupabase`. Already sets `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false`. Preserve auth/admin separation. |

Unused `createClient` imports in the auth registration/login/OAuth/email-verification service files are not instantiations.

Installed packages are `@supabase/supabase-js` 2.50.0 and `@supabase/auth-js` 2.70.0. In installed `node_modules/@supabase/auth-js/src/GoTrueClient.ts:120–121`, persistence and automatic refresh default to true. Lines 2467–2470 start refresh on non-browser platforms; line 2321 installs an interval capturing `this`. Repeated abandoned clients can remain reachable through that interval. `unref()` changes whether a timer keeps the process running; it does not cancel the timer or make its callback collectible. See [Node timers](https://nodejs.org/api/timers.html#timeoutunref) and [Supabase server-side auth configuration](https://supabase.com/docs/reference/javascript/auth).

Missing `persistSession:false` is configuration debt, not proof of an ever-growing session history. Even with persistence disabled, auth methods can maintain an in-memory current session. A shared database/admin client must never be used for user login, `setSession`, or other user-state mutation. The requested “all clients must be singletons” rule needs this exception: operation-local, timer-free auth clients can be safer than sharing mutable auth state. Keep database/storage clients singleton; explicitly review auth isolation separately.

### D. Sockets and request listeners

- `libs/shared/websocket/src/lib/SocketIoWebSocketService.ts:69,72,155`: async token verification precedes disconnect-listener installation. A client can disconnect during verification, then be inserted into `userSockets` after its disconnect event has already fired. Register cleanup before the first await and check `socket.connected` before insertion. The leaked Map entries here are user/socket ID strings, not proof of retained complete sockets.
- `SocketIoWebSocketService.ts:119,176,305,344`: clients can accumulate arbitrary conversation/aggregate rooms while connected. Enforce authorization, ID length, and a room budget. Socket.IO normally removes memberships on disconnect; this is active-connection growth, not demonstrated post-disconnect retention.
- `SocketIoWebSocketService.ts:280,284,294`: callback arrays have no unsubscribe API, but inspected registrations are bootstrap-time, not request-time. No proven per-request global listener accumulation was found.
- `libs/shared/http/src/lib/EventContextMiddleware.ts:60`: uses `res.on('finish')` without aborted-response completion. Add paired one-shot finish/close handlers. This response-owned closure is collectible with its response; a reference cycle alone is not proof of a leak. Current exporter is no-op.
- `libs/shared/core/src/infrastructure/EventRegistry.ts:6,7,23` retains subscriptions as intended. Search telemetry `start()` is not idempotent; bootstrap currently calls it once. Guard repeated start and provide teardown for tests/reinitialization.

### E. Payloads, files and logging

| File and line | Finding and memory mechanism |
|---|---|
| `server.ts:73–82,110` | Global 50 MB JSON/form limit; `Buffer.from(buf)` copies raw JSON for every request. Parsing also builds JS strings/objects. A second JSON middleware is redundant; it normally does not parse an already-parsed body twice. Concurrent requests amplify allocation, even without a permanent leak. |
| `server.ts:54–56,147,193` | Rate limiter is installed after routes and their terminal 404. Normal successful handlers/404 do not reach it. This is ineffective admission control, not a standalone retained array. Put limits before expensive routes/parsers while preserving webhook/health requirements. |
| `libs/services/media/src/lib/api/media.router.ts:7,9,47` | `memoryStorage`, 5 MB per file, up to five files: roughly 25 MB of file buffers per multi-upload, before transport copies/overhead. File limits exist; global concurrency and multipart field/part budgets do not. |
| `libs/services/media/src/lib/api/controllers/MediaController.ts:36,82,91` | Depends on `.buffer`; uploads all files with `Promise.all`. Switching to disk storage alone would break this controller and its DTO/use-case/storage interfaces. |
| `libs/services/media/src/lib/infrastructure/services/PdfkitPdfGenerationService.ts:23,54–60,64` | Downloads full images without explicit size/timeout limits; buffers full PDF and concatenates it. Image count/decoded dimensions/output size need limits. Buffer concatenation temporarily requires both original chunks and result. |
| `libs/shared/logger/src/lib/StructuredLogger.ts:39,113,157` | Default sink writes to stdout without respecting backpressure. There is no application logging array here, but slow stdout can accumulate queued strings/buffers. This is a hypothesis to test using `writableLength`, not a confirmed incident leak. |

### F. Database query and hydration inventory

These are **allocation and concurrency risks**, not proven permanent leaks. Missing an application `.limit()` does not prove unlimited returned rows: actual PostgREST row limits and RPC implementations were not supplied/queried. Large JSON columns can still make a limited row count expensive. `.single()`/`.maybeSingle()` point lookups and count-only reads should not be mechanically paginated.

The following collection paths were identified for refactoring. Use bounded page contracts for public lists, bounded batch iteration for jobs, targeted active-state queries for auth, and server-side aggregation for reporting. Do not silently truncate pricing, reconciliation, authorization, or entire histories.

| Relative file using prefix definitions above | Lines / collection requiring a bound or narrower contract |
|---|---|
| `S/user/infrastructure/supabase/SupabaseUserRepository.ts` | 84: all users; 157–160: provider hydration loads users/addresses/businesses/working days; 205,228: rows collected for counts. |
| `S/request/infrastructure/repositories/SupabaseRequestRepository.ts` | 107,131,147: customer/status/provider request collections, including snapshots. |
| `S/service/infrastructure/repositories/SupabaseServiceRepository.ts` | 95: services by user. |
| `S/service/infrastructure/repositories/SupabaseProductRepository.ts` | 102,119: products by business/owner; 416: inventory ID collection. |
| `S/messaging/infrastructure/repositories/SupabaseMessagingRepository.ts` | 71–77,159–166: optional limits become SQL/RPC null; 92: conversation search has no explicit page argument. RPC definitions must be verified before SQL changes. |
| `S/review/infrastructure/repositories/SupabaseReviewRepository.ts` | 117,142: offering/request review lists. |
| `S/experience/infrastructure/repositories/SupabaseExperienceRepositories.ts` | 301,330,371,400,411,421,432,482,533,563,616,626: experiences, versions, variants, fragments, publications, policies, runtime history and timers. Version/runtime rows can contain large schemas. |
| `S/experience/infrastructure/repositories/SupabaseExperienceAnalyticsRepository.ts` | 131,145: complete experience/session event history. |
| `S/experience/application/services/ExperienceMarketplaceService.ts` | 42–43,123: repeated fragment listing and all-package assembly. Reuse one fetched page, do filtering in storage. |
| `S/identity/infrastructure/repositories/SupabaseIdentityRepository.ts` | 264–266: loads all credentials/sessions/verifications when hydrating an identity. Especially relevant to login; query only required active records and paginate history separately. |
| `S/payment/infrastructure/repositories/SupabasePaymentRepository.ts` | 77,85,120,154,163,187,204,221: request/customer/checkout/business/date/stale-payment collections. Batch reconciliation and keep financial totals complete. |
| `S/finance/infrastructure/repositories/SupabaseFinanceRepository.ts` | 78: funding rows for date-range summaries. Aggregate in SQL instead of hydrating all rows. |
| `S/finance/infrastructure/repositories/SupabasePromotionReportingRepository.ts` | 42: reporting rows grouped in memory. |
| `S/promotion/infrastructure/repositories/SupabasePromotionReportingRepository.ts` | 60: same reporting pattern. |
| `S/service/infrastructure/repositories/SupabaseInventoryRepository.ts` | 265,282–295: optional-only reservation bounds; expiry sweep calls without a limit. 331: per-item hydration. |
| `S/service/infrastructure/repositories/SupabaseEnterpriseRepository.ts` | 169,210: company/purchase-order lists; 269,275,281,287,304: nested collection hydration. Page parent lists; do not fan out every parent concurrently. |
| `S/service/infrastructure/repositories/SupabaseOrderRepository.ts` | 116–141 already defaults to 100 parents, but caller limits need a ceiling; 230,250: child line items; 287: fulfillment-filter IDs loaded before parent pagination. Prefer relational filtering. |
| `S/notification/infrastructure/repositories/SupabaseNotificationRepository.ts` | 45,52: optional-only notification bound. |
| `S/notification/infrastructure/repositories/SupabaseDeliveryRepository.ts` | 41,67: notification/delivery attempt collections; bound retry/report batches. Line 54 is a single-record lookup and is excluded. |
| `S/jobs/infrastructure/repositories/SupabaseJobRepository.ts` | 93: dead-letter list; dequeue itself already limits to one row. |
| `S/rule-engine/infrastructure/repositories/SupabaseRuleRepository.ts` | 38: rule version history. |
| `S/rule-engine/infrastructure/repositories/SupabasePolicyRuleRepository.ts` | 31: all applicable policies; constrain supported ruleset size or evaluate in batches without dropping rules. |
| `S/work-shift/infrastructure/repositories/SupabaseWorkShiftRepository.ts` | 56,79: user/business shifts. |
| `S/business/infrastructure/supabase/SupabaseBusinessRepository.ts` | 44,115,129,141: user businesses/working days/addresses/services. `findAll` already defaults to 100, but validate its maximum. |

Search analytics repositories already have default limits in several methods; index jobs contain page/batch handling. Preserve those and clamp user-supplied values. This inventory is a source-level review queue, not a claim that all listed operations executed during the incident.

## 3. Step-by-step refactoring plan and replacement snippets

The snippets below are proposals, not an applied or tested patch. Illustrative limits need workload validation. Changes to list contracts, authoritative storage and auth state require integration tests and staged rollout.

### Step 1 — establish a comparable baseline

Install the accompanying `memory-diagnostics.ts` once at the top of `setupMiddlewares()`, before body parsing:

```ts
this.app.use(createMemoryDiagnostics());
```

Track absolute heap/RSS/external memory, concurrent requests, cache sizes, active jobs and socket counts. Log Node version, deployed commit and `getHeapStatistics().heap_size_limit` once without logging environment contents. Run identical staged traffic before/after, separated into idle, auth, unique location queries, category resolution, search, uploads and slow-upstream workloads.

The middleware reports process-wide deltas, not allocations attributable to one request. GC and concurrent requests can make deltas negative or misleading. Per-request logging is temporary; sample it after diagnosis. Its finish/close cleanup runs once, and it drops diagnostic logs under stdout backpressure instead of building a log queue.

### Step 2 — fix polling before tuning heap size

In `server.ts`, use a distinct closure guard for each of the three pollers. The guard check must precede the `try`:

```ts
let draining = false;
this.jobPollingTimer = setInterval(async () => {
  if (draining) return;
  draining = true;
  try {
    for (let i = 0; i < 25; i += 1) {
      if (!await jobWorker.processOnce(new Date())) break;
    }
  } catch (error) {
    this.logger.error(error, { operation: 'jobWorker.processOnce' });
  } finally {
    draining = false;
  }
}, 1000);
```

Apply the same structure with separate `scheduling` and `sweepingCalls` flags at lines 374 and 408. Add shutdown cleanup for all three timers, the HTTP server and Socket.IO. A guard limits concurrency but a permanently hung operation still needs transport cancellation; do not clear its guard merely because an outer timeout fired.

In `SupabaseJobRepository.ts`, replace the claim UPDATE tail and result handling:

```ts
const { data: claimed, error: updateError } = await this.deps.supabase
  .from('job_instances')
  .update({
    status: 'RUNNING',
    locked_until: lockedUntil.toISOString(),
    updated_at: now.toISOString(),
  })
  .eq('id', data.id)
  .in('status', ['PENDING', 'FAILED'])
  .or(`locked_until.is.null,locked_until.lte.${now.toISOString()}`)
  .select('*')
  .maybeSingle();
if (updateError) throw updateError;
if (!claimed) return null;
return { job: this.toDomain(claimed) };
```

This verifies claim ownership but is not a complete lease design. Follow with an atomic database claim RPC, unique ownership/fencing token and lease renewal for long jobs before using multiple workers/instances. Never retry a non-idempotent job/write without an idempotency mechanism.

### Step 3 — bound location and category caches

`LocationCache.ts`: keep its public methods/stats; add a hard entry ceiling, refresh insertion order on hits, and prune expired entries during writes. The hard cap prevents unbounded growth even when idle expiry cleanup has not run.

```ts
private readonly maxEntries = 1000;

private write(key: string, value: unknown, ttlMs: number): void {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || key.length > 512) return;
  const now = Date.now();
  for (const [candidate, entry] of this.store) {
    if (entry.expiresAt <= now) {
      this.store.delete(candidate);
      this.evictions += 1;
    }
  }
  this.store.delete(key);
  while (this.store.size >= this.maxEntries) {
    const oldest = this.store.keys().next();
    if (oldest.done) break;
    this.store.delete(oldest.value);
    this.evictions += 1;
  }
  this.store.set(key, { value, expiresAt: now + ttlMs });
  this.writes += 1;
}
```

In `read`, change expiry to `entry.expiresAt <= Date.now()`; after validating the entry, run `this.store.delete(key); this.store.set(key, entry);` before returning it. Cap suggestion count and metadata payload size too: an entry cap is not a byte cap. Prefer existing validation rather than serializing every value just to measure it. Add a lifecycle-owned sweeper only if timely idle expiry matters; do not create a timer per cache key.

For `CategoryExperienceResolverService.ts` and `CategoryArchetypeResolverService.ts`, separate fixed seeds from generated cache entries so eviction never removes the default catalog. The following helper can bound generated entries (FIFO here, deliberately simple; use hit promotion if LRU is needed):

```ts
function rememberGenerated<T>(cache: Map<string, T>, key: string, value: T): T {
  if (key.length > 128) return value; // validate/reject input at the boundary too
  cache.delete(key);
  while (cache.size >= 256) {
    const first = cache.keys().next();
    if (first.done) break;
    cache.delete(first.value);
  }
  cache.set(key, value);
  return value;
}
```

- Profiles file: add `generatedProfiles: Map<string, CategoryExperienceProfile>`. Replace writes at 66/85/104/125 with `rememberGenerated(this.generatedProfiles, generated.key.toLowerCase(), generated)`. Keep constructor seed writes in `profiles`. Lookup checks `profiles.get(key) ?? generatedProfiles.get(key)`. Ensure `listProfiles()` merges both, with a documented generated-entry lifetime.
- Archetypes file: add `generatedArchetypes: Map<string, CategoryArchetype>`. Replace writes at 100/110/121 with the helper; keep seed writes in `archetypes`. Update lookup/list similarly.
- Do not persist arbitrary request metadata in either global generated cache. If metadata changes the output, cache a metadata-free base and apply request metadata after lookup, or use a tenant-aware bounded cache key. Otherwise the current first-writer-wins cache can also mix context between callers.

### Step 4 — centralize database clients without sharing mutable user sessions

Create `libs/shared/config/src/lib/supabaseClient.ts`. Import `env` from the existing `./env` module, not from a barrel that imports the DI container.

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export const serverAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};
let adminClient: SupabaseClient | undefined;
export function getAdminSupabase(): SupabaseClient {
  if (!adminClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase server configuration is missing');
    }
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: serverAuthOptions,
    });
  }
  return adminClient;
}
```

Exact registration changes:

```diff
// libs/shared/config/src/lib/container.ts
- supabase: asFunction(() => { /* validate and createClient */ }).singleton(),
+ supabase: asFunction(getAdminSupabase).singleton(),

// registerAuthModule.ts, registerUserModule.ts
- supabase: asFunction(/* duplicate client factory */).singleton(),
// Delete these entries and unused createClient imports. Use root registration.

// libs/shared/messaging/src/lib/registerQueueClient.ts
- container.register({ supabase: asFunction(/* client factory */).singleton() });
// Keep queueClient registration; rely on the existing root supabase registration.
```

Repository/service constructor replacements (remove their local `createClient` and env imports; retain their existing class fields and methods):

```ts
// SupabaseStorageService.ts — PROXY injection
constructor(deps: { supabase: SupabaseClient; retryPolicyFactory?: RetryPolicyFactory }) {
  this.client = deps.supabase;
  this.retryPolicyFactory = deps.retryPolicyFactory;
}

// SupabaseRuleRepository.ts and SupabasePolicyRuleRepository.ts — PROXY injection
constructor({ supabase }: { supabase: SupabaseClient }) {
  this.supabase = supabase;
}

// SupabasePricingSnapshotRepository.ts — existing CLASSIC injection
constructor(supabase: SupabaseClient, retryPolicyFactory?: RetryPolicyFactory) {
  this.supabase = supabase;
  this.retryPolicyFactory = retryPolicyFactory;
}
```

`SupabaseDeliveryPricingPolicyRepository.ts`: make `dependencies.supabase` required, assign it in the constructor, and remove `createSupabaseClient()` at line 187. In `registerPricingModule.ts`, inject `c.resolve('supabase')` directly instead of an optional fallback. Update isolated tests/callers to inject test clients.

`SupabasePrismaAdapter.ts`: immediate containment is to supply `auth: serverAuthOptions` to its existing constructor factory. Do **not** inject the database/admin singleton into `this.supabase`, because this adapter signs users in and out. Follow with operation-local auth clients for methods that mutate user sessions, or migration to the existing identity/session service. Require explicit tokens for update/logout flows; `signOut()` on a process-shared current session is not a correct per-user logout contract. Apply the same auth-isolation review to `GoTrueIdentityAdapter.ts`, which currently receives the correctly configured but shared `identityAuthSupabase` singleton.

```ts
// SupabasePrismaAdapter.ts immediate non-contract-changing containment
this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
```

This containment disables timers; it does not solve all auth state concurrency. Verify simultaneous logins/OAuth/OTP/update-password/logout/refresh before migrating ownership. Do not introduce request scopes just to fix client ownership: the existing mediator resolves from the root, and a scope refactor is broader than this audit.

### Step 5 — make timeouts cancel work

`RetryPolicyFactory.ts`: introduce an explicit abortable operation API and migrate transport callers; merely replacing `Promise.race` without passing a signal into I/O will not fix retention.

```ts
async function runAbortable<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  name: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new OperationTimeoutError(name, timeoutMs)),
    timeoutMs,
  );
  timer.unref();
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
```

In repositories, pass the signal to each PostgREST builder (`.abortSignal(signal)`) and throw returned errors; in Axios calls pass `{ signal, timeout: ... }`. Multi-step operations must propagate the same deadline to every step. This helper waits for cancellation to settle, so a callback that ignores the signal can still hang: leave non-abortable operations on a separately bounded concurrency path until migrated. Add a real transport deadline to auth/storage clients through their supported fetch configuration. Do not claim `timeoutMs` is enforced merely because a circuit breaker accepts it. Preserve retry classification and idempotency rules; first verify whether timed-out writes committed.

`SearchEventTelemetryHandler.ts`: make `start()` idempotent, bound pending/in-flight inference, copy only required scalar fields, and remove the Map entry before awaiting DB work. Use identity checks when deleting entries so an old callback cannot delete a newer timer:

```ts
// At scheduling time, before creating another timer:
if (this.abandonmentTimers.size >= 1000) {
  // Count a dropped optional inference; do not queue more work in memory.
  return;
}
// At callback entry, before the first await:
if (this.abandonmentTimers.get(requestId) === timeout) {
  this.abandonmentTimers.delete(requestId);
}
```

Also cap executing inference operations (for example 4), apply cancellable DB deadlines and add shutdown cleanup that clears all timer handles. A timer cap alone does not cap work after timers fire. If inference must be reliable, schedule it through the existing persisted job queue with an idempotency key instead of dropping at capacity. Avoid capturing the whole event/request async context in long-lived timers; schedule through a detached worker with explicit necessary metadata.

### Step 6 — correct socket and response lifecycle handling

`SocketIoWebSocketService.ts`: move existing disconnect handling to the beginning of the connection callback, before `verifyToken`; remove the old handler at line 155. Gate insertion after verification:

```ts
socket.once('disconnect', () => {
  const userId = socket.data.userId;
  if (!userId) return;
  this.removeUserSocket(userId, socket.id);
  this.userDisconnectedCallbacks.forEach((callback) => callback(userId));
});
const decoded = await this.jwtTokenService.verifyToken(token);
if (!socket.connected) return;
if (!decoded || !(decoded as any).sub) {
  socket.disconnect(true);
  return;
}
socket.data.userId = (decoded as any).sub;
this.addUserSocket(socket.data.userId, socket.id);
```

Preserve missing/invalid-token handling with early returns. Bound verification time and pending handshakes. Before either `socket.join`, verify authorized membership, validate identifier length, and reject new joins when the socket room budget is reached (excluding its private room). Add a `close()` lifecycle method and call it during server shutdown. Callback subscriptions should return an unsubscribe function if runtime registration is introduced.

`EventContextMiddleware.ts`: replace the current finish listener with:

```ts
let ended = false;
const end = () => {
  if (ended) return;
  ended = true;
  res.off('finish', end);
  res.off('close', end);
  span.end({
    ok: res.writableFinished && res.statusCode < 500,
    attributes: { httpStatusCode: res.statusCode, aborted: !res.writableFinished },
  });
};
res.once('finish', end);
res.once('close', end);
```

### Step 7 — cap expensive request allocations without breaking uploads/webhooks

`server.ts`: install rate/admission limits before expensive API middleware, remove the redundant JSON parser, and initially eliminate the unnecessary copy:

```diff
- (req as any).rawBody = Buffer.from(buf);
+ (req as any).rawBody = buf;
```

Next, use route-specific parsers: small auth payload limit (e.g. 32 KB), normal API limit (e.g. 1 MB), and explicitly budgeted schema/import endpoints. Capture raw bytes only on the exact signed webhook routes. Existing Paystack webhook uses `rawBody` at `libs/services/payment/src/lib/api/controllers/PaystackWebhookController.ts:10`; preserve both canonical and legacy aliases from `payment.router.ts:131,141`, plus internal queue HMAC routes. Do not verify signatures against reserialized JSON. Lowering the existing 50 MB limit globally before checking schema consumers would be a breaking change.

`media.router.ts`: retain the current memory-based interface for an initial containment patch, add multipart limits and a small concurrency gate **before Multer**:

```ts
limits: {
  fileSize: 5 * 1024 * 1024,
  files: 5,
  fields: 10,
  fieldSize: 16 * 1024,
  parts: 15,
}
```

Use an operation-scoped capacity gate that does not accumulate a waiting queue. Its release must correspond to cancellation/completion of upload work, not just the HTTP close event if a remote upload still runs. Start with measured concurrent-upload budget; account for 25 MB input plus copies per multi-upload. Preserve auth before accepting upload data. `MediaController.ts:91` may process uploads sequentially to reduce remote-upload overlap, but all Multer buffers already exist by then, so that alone does not remove input buffering.

Longer-term streaming change affects all of:

- `media.router.ts`: streaming storage engine or disk-backed temporary files with strict quotas/cleanup.
- `api/controllers/MediaController.ts` and `application/dtos/media.dto.ts`: pass a file source/path rather than `req.file.buffer`.
- `application/use-cases/media.handlers.ts`: consume source with cancellation and bounded concurrency.
- `domain/ports/storage/IStorageService.ts` and `infrastructure/services/SupabaseStorageService.ts`: add an explicitly supported streaming upload path; verify installed SDK/runtime support before implementation.
- PDF port/implementation and its caller: add a stream-to-storage path, preserving the existing Buffer method temporarily if required.

`PdfkitPdfGenerationService.ts`: immediate input/network bounds:

```ts
if (imageUrls.length > 10) throw new Error('Too many PDF images');
const response = await axios.get(url, {
  responseType: 'arraybuffer',
  timeout: 10_000,
  maxContentLength: 5 * 1024 * 1024,
  maxBodyLength: 5 * 1024 * 1024,
});
```

Additionally enforce decoded pixel dimensions, a total PDF output byte ceiling while collecting chunks, destroy the PDF stream on failure, and ensure its promise rejection is always observed. A compressed image byte limit does not bound decoded image memory. The final design should `pipeline()` PDF output into the supported destination and await completion/abort, without `buffers.push`/`Buffer.concat`.

`StructuredLogger.ts`: preserve existing sinks, but use a bounded production sink. Minimal default-sink containment:

```ts
write: (line: string) => {
  if (process.stdout.destroyed || process.stdout.writableNeedDrain) {
    droppedLogCount += 1; // bounded numeric counter exported separately
    return;
  }
  process.stdout.write(line);
}
```

Define the counter in the logger module; count rather than recursively logging drops. Truncate oversized metadata before serialization and remove full socket payload logging at `SocketIoWebSocketService.ts:108–115`. An established bounded logging exporter is preferable if every error must be preserved.

### Step 8 — replace authoritative memory stores and harden latent helpers

**Do not fix these with cache eviction:** plugin definitions, approval decisions, vertical definitions and feature-flag overrides are business state. Add repository contracts/implementations with pagination, persist before acknowledging writes, migrate existing process-held state before restart, then use small disposable read caches. Migration/schema work is a separate reviewed change.

Replacement direction for each affected file:

```ts
// ExperiencePluginRegistryService.ts: replace plugins.set on registrations
await this.pluginRepository.upsert(plugin);
// registerPlugin becomes async; ExperienceController.ts:1077 must await it.

// ExperienceMarketplaceService.ts: replace approvals.set
await this.approvalRepository.upsert({
  packageId: approved.id,
  approvedBy: approved.approvedBy,
  approvedAt: approved.approvedAt,
  notes: parsed.notes,
});
// Build only a requested package page; join persisted approval facts by package ID.

// registerExperienceModule.ts: replace the verticalRepository registration
verticalRepository: asClass(SupabaseVerticalRepository, {
  injectionMode: 'CLASSIC',
}).singleton(),

// registerFeatureFlagsModule.ts: replace the in-memory production repository
featureFlagRepository: asClass(SupabaseFeatureFlagRepository, {
  injectionMode: 'CLASSIC',
}).singleton(),
```

The new repository names above are proposed contracts, not existing implementations. Their SQL schema, authorization, uniqueness, migrations and bootstrap defaults must be reviewed before rollout. Until migrated, reject additions beyond an explicit capacity rather than silently deleting existing authoritative records; this behavior needs a documented API error.

`InMemoryVerticalRepository.ts`: if retained for tests, remove stale slug indexes when an ID changes slug and provide reset/delete methods. `VerticalDefinition.ts`: add explicit event clearing after successful publication/persistence, not before. Example acknowledgement method:

```ts
public clearEvents(): void {
  this.domainEvents.length = 0;
}
```

`VerticalRegistryService.ts` should publish/acknowledge its events. `ExperienceApplicationService.ts:3751` should likewise clear pending events after successfully publishing them, preserving retry/outbox behavior. Most other experience entities are transient; their event arrays alone are not proven process-level leaks.

For dormant `IdentityOperationFramework.ts`, use bounded aggregated metrics instead of raw timing samples; if a diagnostic sample array must remain, cap it:

```ts
timing(metric: string, valueMs: number, tags?: Record<string, string>): void {
  if (this.timings.length >= 256) this.timings.shift();
  this.timings.push({ metric, valueMs, tags: tags ? { ...tags } : undefined });
}
```

Use fixed allowed metric/tag names and bounded string lengths. Sweep expired reservation/lock entries on acquisition and enforce a maximum active count. At capacity, reject new reservations/locks rather than evict live ones, which would violate idempotency/exclusion. Always release in caller `finally`. These in-memory locks are not distributed across Render instances; use a durable atomic mechanism before relying on them in production.

`MetricsCollector.ts`: validate metric/label cardinality before insertion, keep aggregates, and reject/drop excess telemetry series into a fixed overflow counter. Do not reset on each request. `TracingProvider.ts` in-memory exporter: cap diagnostic spans (e.g. 256) or restrict it to tests; production already uses no-op. `CircuitBreakerFactory.ts`: validate names against known operations rather than retaining arbitrary request-specific names. `InMemoryJobScheduleRepository.ts`: keep finite predefined schedule IDs; persist user-created schedules if added. Test-only job/workflow/identity stores need explicit reset between tests, not production LRU policies.

### Step 9 — implement bounded query contracts

Apply this page-normalization pattern to every public list in the query inventory, at the API boundary and again in repositories for internal callers:

```ts
function pageSize(value: unknown, fallback = 50, maximum = 100): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, maximum) : fallback;
}
function pageOffset(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}
```

For `SupabaseNotificationRepository.ts`, replace the optional-only limit with an unconditional normalized limit. For `SupabaseMessagingRepository.ts`, replace both RPC parameter sets:

```diff
- p_limit: limit || null,
- p_offset: offset || null,
+ p_limit: pageSize(limit),
+ p_offset: pageOffset(offset),
```

For request/user/service/product/review/business/work-shift lists, add pagination options to the repository interface, use case and controller together, then apply stable ordering and a bounded range before awaiting the query. Example replacement for the query inside `SupabaseRequestRepository.getByCustomerId` (after adding `options` to the interface/callers):

```ts
const limit = pageSize(options.limit);
const offset = pageOffset(options.offset);
const { data, error } = await this.supabase
  .from('service_requests')
  .select('*')
  .eq('customer_id', customerId)
  .order('id', { ascending: true })
  .range(offset, offset + limit - 1);
```

Use narrow list DTO columns where supported, with full snapshots fetched on detail routes. Public pagination changes must preserve access to subsequent records, not silently return the first page as a complete list.

For inventory expiry, stale payments, dead letters, experience timers and bulk jobs, implement a cursor-based page iterator and **process each page before fetching the next**. Do not append pages to one `allRows` array. In `SupabaseInventoryRepository.listExpiredReservations`, give the sweep an explicit batch size and continuation; use ascending stable ordering. For reconciliation/date-range reporting in payment/finance/promotion, use SQL aggregation or pagewise incremental aggregation; never cap a financial total to the first 100 rows.

For experience repository history methods, add bounded history pages and select a single latest version/snapshot for runtime resolution. Fetch marketplace fragments once per page rather than twice. For `SupabaseIdentityRepository.loadRelatedEntities`, split authentication checks from full-history hydration: fetch only required active session/credential/verification records, use counts for session limits, and expose paginated history elsewhere. Test login/refresh/revocation semantics before filtering.

For order/enterprise nested collections, bound the parent page and child item counts at write time, fetch children in bounded batches, and replace fulfillment-filter ID preloading with a relational query/RPC. Clamp existing `options.limit` values in order/business/search repositories even where defaults exist. Required policy-rule evaluation must remain complete: version/size rulesets or iterate bounded batches rather than discarding policies.

## 4. Verification and root-cause confirmation

Recommended checks only; none were executed:

1. Capture comparable absolute memory metrics, deployed SHA, Node version, Render RAM quota and OOM evidence. Distinguish process OOM from upstream 503/circuit-breaker failures.
2. On a staging instance with synthetic data and memory headroom, warm the service, snapshot the heap, run a fixed workload, let requests/timers drain, collect again, repeat. Do not take a large heap snapshot on the already-exhausted production instance; snapshots can pause execution, require substantial extra memory and contain tokens/user data. Use access-controlled artifacts. See [Node heap snapshot guidance](https://nodejs.org/en/learn/diagnostics/memory/using-heap-snapshot).
3. Inspect retained-size dominators and paths: location/profile/archetype Maps; plugin/approval records; `Timeout → GoTrueClient`; search timers/event payloads; pending job promises/network requests; stdout buffers. Compare instance counts, not only one heap percentage.
4. Cache test: many unique keys; advance time; insert more keys. Assert entry budgets and that seeds survive. Check metadata isolation between callers.
5. Polling test: hold a worker call across several timer ticks; maximum concurrent drain must remain 1. Repeat for scheduler/heartbeat. Verify a failed conditional job claim returns no job.
6. Timeout test: stalled upstream must observe an abort and close; no additional retry starts while the old operation remains active. Exercise idempotent and non-idempotent writes separately.
7. Socket test: disconnect during token verification; no stale user ID/room entries remain. Repeated connect/disconnect and aborted HTTP responses must not grow listeners/maps.
8. Upload/PDF tests: maximum legal payload, over-limit payload, concurrency saturation, remote stall and client disconnect. Verify RAM plateaus, work cancellation and temporary-file/stream cleanup. Preserve webhook HMAC verification with original bytes.
9. Query tests: page continuity, stable order, bounded limits, complete financial aggregates, auth/session invariants and no cross-user auth state.
10. Repeat the same soak workload after each focused change. Success means a stable post-GC retained heap baseline, bounded in-flight work/cache counts, adequate RSS headroom, and stable endpoint availability. A sawtooth heap is normal; one request's positive heap delta is not a leak measurement.

After approval, suggested sequence is polling/cancellation and cache bounds first; client configuration and lifecycle cleanup next; payload admission; then contract/persistence/pagination changes. Recommend targeted Jest coverage for touched Node areas. Static analysis/lint/build checks may be recommended for your team but were not run, honoring your explicit prohibition. Flutter tooling is irrelevant to this backend audit.

The middleware is available separately in `memory-diagnostics.ts`. This report is ready for review; it makes no assertion that the local checkout exactly matches the deployed Render artifact or that a production retaining path has been measured.
