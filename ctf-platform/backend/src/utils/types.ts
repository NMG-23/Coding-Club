/**
 * Shared types for the CTF platform.
 */

// Auth context injected by authMiddleware via .derive()
export interface AuthContext {
  user: {
    id: string;
    username: string;
    role: string;
    teamId: string | null;
  };
  token: string;
}
