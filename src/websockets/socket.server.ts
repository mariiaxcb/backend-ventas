import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

let ioInstance: Server | null = null;

export function inicializarSocket(server: HttpServer): Server {
  ioInstance = new Server(server, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket: Socket) => {
    logger.info(`Cliente conectado al socket: ${socket.id}`);

    // Permite al frontend unirse a la sala específica del live
    socket.on('join_room', (room: string) => {
      socket.join(room);
      logger.info(`📌 Socket ${socket.id} se unió exitosamente a la sala: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Cliente desconectado del socket: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io no ha sido inicializado.');
  }
  return ioInstance;
}