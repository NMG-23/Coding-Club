import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/leaderboard';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
}

interface LeaderboardData {
  users: LeaderboardEntry[];
  teams: LeaderboardEntry[];
}

interface FirstBloodEvent {
  username: string;
  teamName: string | null;
  challengeTitle: string;
  points: number;
  timestamp: number;
}

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardData>({ users: [], teams: [] });
  const [frozen, setFrozen] = useState(false);
  const [firstBlood, setFirstBlood] = useState<FirstBloodEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] Connected to leaderboard');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'leaderboard:update') {
          setData(message.data);
          setFrozen(message.frozen || false);
        }

        if (message.type === 'first-blood') {
          setFirstBlood(message.data);
          // Auto-clear after 5 seconds
          setTimeout(() => setFirstBlood(null), 5000);
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[WS] Disconnected, reconnecting in 3s...');
      reconnectTimeout.current = window.setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { data, frozen, firstBlood, connected };
}
