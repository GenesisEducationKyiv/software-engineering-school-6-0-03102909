import rateLimit from 'express-rate-limit';

export const subscribeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100, 
  message: {
    error: 'Too many subscription requests from this IP. Please try again later.',
  },
  standardHeaders: 'draft-8', 
  legacyHeaders: false, 
});
