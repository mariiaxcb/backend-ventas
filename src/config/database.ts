import { PrismaClient } from "@prisma/client";
import { env } from "./env.config";

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});

export async function conectarBaseDatos() {
  await prisma.$connect();
}

export async function desconectarBaseDatos() {
  await prisma.$disconnect();
}
