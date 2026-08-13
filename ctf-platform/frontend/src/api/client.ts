const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  async request<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const token = this.getToken();

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (response.status === 401) {
      // Try to refresh the token
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        const newToken = this.getToken();
        config.headers = {
          ...config.headers as Record<string, string>,
          Authorization: `Bearer ${newToken}`,
        };
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, config);
        const retryData = await retryResponse.json();
        if (!retryResponse.ok) throw new ApiError(retryData.error?.message || 'Request failed', retryResponse.status);
        return retryData as T;
      } else {
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new ApiError('Session expired', 401);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || 'Request failed',
        response.status,
        data.error?.code
      );
    }

    return data as T;
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Auth ────────────────────────────────────────────────────────────
  async register(username: string, email: string, password: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { username, email, password },
    });
  }

  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // ─── Challenges ──────────────────────────────────────────────────────
  async getChallenges() {
    return this.request('/challenges');
  }

  async getChallenge(id: string) {
    return this.request(`/challenges/${id}`);
  }

  // ─── Submissions ────────────────────────────────────────────────────
  async submitFlag(challengeId: string, flag: string) {
    return this.request('/submissions', {
      method: 'POST',
      body: { challengeId, flag },
    });
  }

  async getMySubmissions() {
    return this.request('/submissions/mine');
  }

  // ─── Leaderboard ────────────────────────────────────────────────────
  async getLeaderboardUsers(limit = 50) {
    return this.request(`/leaderboard/users?limit=${limit}`);
  }

  async getLeaderboardTeams(limit = 50) {
    return this.request(`/leaderboard/teams?limit=${limit}`);
  }

  async getMyRank() {
    return this.request('/leaderboard/me');
  }

  // ─── Teams ──────────────────────────────────────────────────────────
  async createTeam(name: string) {
    return this.request('/teams', { method: 'POST', body: { name } });
  }

  async joinTeam(inviteCode: string) {
    return this.request('/teams/join', { method: 'POST', body: { inviteCode } });
  }

  async leaveTeam() {
    return this.request('/teams/leave', { method: 'POST' });
  }

  async getMyTeam() {
    return this.request('/teams/mine');
  }

  // ─── Users ──────────────────────────────────────────────────────────
  async getProfile() {
    return this.request('/users/me');
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const api = new ApiClient(API_BASE);
