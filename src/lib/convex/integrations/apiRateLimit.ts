import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter';
import { components } from '../_generated/api';

// Per-API-key: 100 requests / minute (fixed window)
export const apiV1RateLimiter = new RateLimiter(components.rateLimiter, {
	apiV1Request: {
		kind: 'fixed window',
		rate: 100,
		period: MINUTE
	}
});
