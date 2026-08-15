import { Server } from 'bun';

let serverInstance: Server<any> | null = null;

export const setServer = (server: Server<any>) => {
  serverInstance = server;
};

export const broadcast = (type: string, payload: any) => {
  if (serverInstance) {
    serverInstance.publish('events', JSON.stringify({ type, payload }));
  }
};
