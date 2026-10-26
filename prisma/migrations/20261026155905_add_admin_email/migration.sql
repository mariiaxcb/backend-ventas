-- AlterTable: agregar email al admin
ALTER TABLE "Admin" ADD COLUMN "email" VARCHAR(255);

-- El admin existente recibe el correo que se usa para el envio.
UPDATE "Admin" SET "email" = 'eleenaber@gmail.com' WHERE "email" IS NULL;

-- Hacer la columna obligatoria y unica.
ALTER TABLE "Admin" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");