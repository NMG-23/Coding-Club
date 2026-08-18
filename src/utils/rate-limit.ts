export const createRateLimiter = ({ max, duration }: { max: number, duration: number }) => {
  const store = new Map<string, { count: number, resetAt: number }>();
  
  return ({ request, set }: any) => {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
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
