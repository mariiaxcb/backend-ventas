import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "@/config/env.config";
import { logger } from "@/utils/logger";

let io: SocketIOServer | null = null;

export function inicializarSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No autenticado"));

    try {
      jwt.verify(token, env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Cliente conectado al socket: ${socket.id}`);

    socket.on("live:unirse", (liveId: string) => {
      socket.join(`live:${liveId}`);
    });

    socket.on("live:salir", (liveId: string) => {
      socket.leave(`live:${liveId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Cliente desconectado del socket: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io no ha sido inicializado");
  return io;
}
