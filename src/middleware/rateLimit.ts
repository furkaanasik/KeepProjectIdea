import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

export function createAnalyzeLimiter(): RateLimitRequestHandler {
  const max = Number(process.env.ANALYZE_RATE_MAX ?? 5);
  return rateLimit({
    windowMs: 60_000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'rate_limited' },
  });
}
