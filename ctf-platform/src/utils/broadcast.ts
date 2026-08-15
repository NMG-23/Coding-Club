import { Server } from 'bun';

let serverInstance: Server | null = null;

export const setServer = (server: Server) => {
  serverInstance = server;
};

export const broadcast = (type: string, payload: any) => {
  if (serverInstance) {
    serverInstance.publish('events', JSON.stringify({ type, payload }));
  }
};
