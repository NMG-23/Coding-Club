import { Elysia } from "elysia";

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter = (options = { limit: 100, windowSec: 60 }) => {
  return new Elysia().derive(({ request }) => {
    // Basic IP extraction. In production behind a proxy, use X-Forwarded-For
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    return {
      checkRateLimit: () => {
        const now = Date.now();
        const record = rateLimits.get(ip);
        
        if (record) {
          if (now > record.resetAt) {
            // Window expired, reset
            rateLimits.set(ip, { count: 1, resetAt: now + options.windowSec * 1000 });
            return { allowed: true, remaining: options.limit - 1 };
          }
          
          if (record.count >= options.limit) {
            return { allowed: false, remaining: 0 };
          }
          
          record.count++;
          return { allowed: true, remaining: options.limit - record.count };
        } else {
          // New IP
          rateLimits.set(ip, { count: 1, resetAt: now + options.windowSec * 1000 });
          return { allowed: true, remaining: options.limit - 1 };
        }
      },
    };
  });
};
