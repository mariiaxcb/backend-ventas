-- CreateEnum
CREATE TYPE "EstadoProducto" AS ENUM ('ACTIVO', 'INACTIVO', 'AGOTADO');

-- CreateEnum
CREATE TYPE "EstadoTransmision" AS ENUM ('PROGRAMADA', 'EN_VIVO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'EN_REVISION', 'PAGADO', 'RECHAZADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('PENDIENTE', 'VALIDADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoGeneral" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateTable
CREATE TABLE "Categoria" (
    "idCategoria" SERIAL NOT NULL,
    "nombreCategoria" VARCHAR(100) NOT NULL,
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("idCategoria")
);

-- CreateTable
CREATE TABLE "Producto" (
    "idProducto" SERIAL NOT NULL,
    "nombreProducto" VARCHAR(150) NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "estado" "EstadoProducto" NOT NULL DEFAULT 'ACTIVO',
    "urlImagen" VARCHAR(255),
    "idCategoria" INTEGER NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("idProducto")
);

-- CreateTable
CREATE TABLE "Historial" (
    "idHistorial" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoMovimiento" "TipoMovimiento" NOT NULL,
    "idProducto" INTEGER NOT NULL,

    CONSTRAINT "Historial_pkey" PRIMARY KEY ("idHistorial")
);

-- CreateTable
CREATE TABLE "Administrador" (
    "idAdministrador" SERIAL NOT NULL,
    "usuario" VARCHAR(50) NOT NULL,
    "clave" VARCHAR(255) NOT NULL,
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("idAdministrador")
);

-- CreateTable
CREATE TABLE "Transmision" (
    "idTransmision" SERIAL NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "titulo" VARCHAR(150) NOT NULL,
    "estado" "EstadoTransmision" NOT NULL DEFAULT 'PROGRAMADA',
    "idAdministrador" INTEGER NOT NULL,

    CONSTRAINT "Transmision_pkey" PRIMARY KEY ("idTransmision")
);

-- CreateTable
CREATE TABLE "Comprador" (
    "idComprador" SERIAL NOT NULL,
    "usuarioTiktok" VARCHAR(50),
    "whatsapp" VARCHAR(20) NOT NULL,
    "nombreCliente" VARCHAR(100) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comprador_pkey" PRIMARY KEY ("idComprador")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "idPedido" SERIAL NOT NULL,
    "precioTotal" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "idComprador" INTEGER NOT NULL,
    "idTransmision" INTEGER NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("idPedido")
);

-- CreateTable
CREATE TABLE "DetallePedido" (
    "idDetallePedido" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "idProducto" INTEGER NOT NULL,
    "idPedido" INTEGER NOT NULL,

    CONSTRAINT "DetallePedido_pkey" PRIMARY KEY ("idDetallePedido")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "idMensaje" SERIAL NOT NULL,
    "contenido" TEXT NOT NULL,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'ENVIADO',
    "idPedido" INTEGER NOT NULL,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("idMensaje")
);

-- CreateTable
CREATE TABLE "Comprobante" (
    "idComprobante" SERIAL NOT NULL,
    "imagenUrl" VARCHAR(255) NOT NULL,
    "montoExtraido" DECIMAL(10,2),
    "estadoValidacion" "EstadoComprobante" NOT NULL DEFAULT 'PENDIENTE',
    "idPedido" INTEGER NOT NULL,

    CONSTRAINT "Comprobante_pkey" PRIMARY KEY ("idComprobante")
);

-- CreateIndex
CREATE UNIQUE INDEX "Administrador_usuario_key" ON "Administrador"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Comprobante_idPedido_key" ON "Comprobante"("idPedido");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_idCategoria_fkey" FOREIGN KEY ("idCategoria") REFERENCES "Categoria"("idCategoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historial" ADD CONSTRAINT "Historial_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Producto"("idProducto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmision" ADD CONSTRAINT "Transmision_idAdministrador_fkey" FOREIGN KEY ("idAdministrador") REFERENCES "Administrador"("idAdministrador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_idComprador_fkey" FOREIGN KEY ("idComprador") REFERENCES "Comprador"("idComprador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_idTransmision_fkey" FOREIGN KEY ("idTransmision") REFERENCES "Transmision"("idTransmision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePedido" ADD CONSTRAINT "DetallePedido_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Producto"("idProducto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePedido" ADD CONSTRAINT "DetallePedido_idPedido_fkey" FOREIGN KEY ("idPedido") REFERENCES "Pedido"("idPedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_idPedido_fkey" FOREIGN KEY ("idPedido") REFERENCES "Pedido"("idPedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_idPedido_fkey" FOREIGN KEY ("idPedido") REFERENCES "Pedido"("idPedido") ON DELETE RESTRICT ON UPDATE CASCADE;
