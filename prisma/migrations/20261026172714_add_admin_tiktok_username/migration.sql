-- AlterTable: agregar el usuario de TikTok del negocio al admin.
ALTER TABLE "Admin" ADD COLUMN "tiktokUsername" VARCHAR(100);