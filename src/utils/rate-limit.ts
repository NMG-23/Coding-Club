export const createRateLimiter = ({ max, duration }: { max: number, duration: number }) => {
  const store = new Map<string, { count: number, resetAt: number }>();
  
  // Clean up expired entries every 60 seconds to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt < now) {
        store.delete(key);
      }
    }
  }, Math.max(60000, duration));
  
  return ({ request, set, server }: any) => {
    // Prevent X-Forwarded-For spoofing by trusting the socket IP when possible
    const ip = server?.requestIP?.(request)?.address || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    
    let record = store.get(ip);
    
    if (!record || record.resetAt < now) {
      store.set(ip, { count: 1, resetAt: now + duration });
      return;
    }
    
    record.count++;
    
    if (record.count > max) {
      set.status = 429;
      return { success: false, error: 'Too Many Requests' };
    }
  };
};
