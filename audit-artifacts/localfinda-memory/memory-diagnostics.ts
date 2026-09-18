import type { RequestHandler } from 'express';
import { getHeapStatistics } from 'node:v8';

// Review artifact only: not installed in the backend.
// Register once, before parsers and routes. No bodies, URLs, tokens or user IDs.
export function createMemoryDiagnostics(): RequestHandler {
  let inFlight = 0;
  let droppedLogs = 0;
  const heapLimit = getHeapStatistics().heap_size_limit;

  return (req, res, next) => {
    const started = process.hrtime.bigint();
    const heapBefore = process.memoryUsage().heapUsed;
    const method = req.method;
    inFlight += 1;
    let completed = false;

    const complete = () => {
      if (completed) return;
      completed = true;
      res.removeListener('finish', complete);
      res.removeListener('close', complete);
      inFlight -= 1;

      // Do not build a diagnostic log queue when stdout is congested.
      if (process.stdout.destroyed || process.stdout.writableNeedDrain) {
        droppedLogs += 1;
        return;
      }
      const memory = process.memoryUsage();
      // Express route templates avoid IDs/query strings in req.originalUrl.
      const route = typeof req.route?.path === 'string'
        ? req.route.path.slice(0, 160)
        : 'unmatched-or-middleware';
      const line = {
        event: 'request_memory',
        timestamp: new Date().toISOString(),
        pid: process.pid,
        method,
        route,
        status: res.statusCode,
        aborted: !res.writableFinished,
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        inFlight,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        heapLimit,
        heapUsedRatio: memory.heapUsed / Math.max(1, memory.heapTotal),
        heapLimitRatio: memory.heapUsed / heapLimit,
        heapDeltaBytes: memory.heapUsed - heapBefore,
        rss: memory.rss,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers,
        droppedLogs,
      };
      droppedLogs = 0;
      process.stdout.write(`${JSON.stringify(line)}\n`);
    };

    res.once('finish', complete);
    res.once('close', complete);
    next();
  };
}
