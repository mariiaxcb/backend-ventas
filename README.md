# 📚 API Endpoints Summary

**Base URL:** `http://localhost:8080/api`

---

## 🔐 1. Autenticación (`/auth`)

| Método | Endpoint      | Auth  | Content-Type       | Descripción                     |
| :----- | :------------ | :---- | :----------------- | :------------------------------ |
| `POST` | `/auth/login` | ❌ No | `application/json` | Iniciar sesión de Administrador |

---

## 📦 2. Productos (`/products`)

| Método   | Endpoint               | Auth  | Content-Type                   | Parámetros / Body                                                | Descripción                                          |
| :------- | :--------------------- | :---- | :----------------------------- | :--------------------------------------------------------------- | :--------------------------------------------------- |
| `GET`    | `/products`            | 🔒 Sí | -                              | Query: `inStock`, `status`, `categoryId`                         | Listar productos con filtros                         |
| `GET`    | `/products/categories` | 🔒 Sí | -                              | -                                                                | Obtener listado de categorías con total de productos |
| `GET`    | `/products/:id`        | 🔒 Sí | -                              | Param: `id`                                                      | Obtener un producto por ID                           |
| `POST`   | `/products`            | 🔒 Sí | `multipart/form-data`          | `name`, `price`, `stock`, `categoryName`, `description`, `image` | Crear un nuevo producto                              |
| `PUT`    | `/products/:id`        | 🔒 Sí | `multipart/form-data` / `json` | Param: `id` + campos a modificar                                 | Actualizar información o imagen                      |
| `DELETE` | `/products/:id`        | 🔒 Sí | -                              | Param: `id`                                                      | Eliminar un producto                                 |

---

## 🎥 3. Transmisiones en Vivo (`/streams`)

| Método | Endpoint           | Auth  | Content-Type       | Parámetros / Body | Descripción                          |
| :----- | :----------------- | :---- | :----------------- | :---------------- | :----------------------------------- |
| `POST` | `/streams`         | 🔒 Sí | `application/json` | `title`           | Iniciar transmisión en vivo (`LIVE`) |
| `GET`  | `/streams/active`  | 🔒 Sí | -                  | -                 | Obtener la transmisión activa actual |
| `PUT`  | `/streams/:id/end` | 🔒 Sí | -                  | Param: `id`       | Finalizar transmisión (`ENDED`)      |
| `GET`  | `/streams`         | 🔒 Sí | -                  | -                 | Listar historial de transmisiones    |

---

## 🛒 4. Pedidos (`/orders`)

| Método  | Endpoint             | Auth  | Content-Type       | Parámetros / Body                                               | Descripción                        |
| :------ | :------------------- | :---- | :----------------- | :-------------------------------------------------------------- | :--------------------------------- |
| `POST`  | `/orders`            | 🔒 Sí | `application/json` | `clientName`, `whatsapp`, `tiktokUsername`, `streamId`, `items` | Registrar nuevo pedido y comprador |
| `GET`   | `/orders`            | 🔒 Sí | -                  | Query: `streamId`, `status`, `buyerId`                          | Listar pedidos con filtros         |
| `GET`   | `/orders/:id`        | 🔒 Sí | -                  | Param: `id`                                                     | Obtener detalle de un pedido       |
| `PATCH` | `/orders/:id/status` | 🔒 Sí | `application/json` | Param: `id` + `status`                                          | Cambiar estado de un pedido        |

## 💬 5. Mensajes (`/messages`)

| Método  | Endpoint                   | Auth  | Content-Type       | Parámetros / Body              | Descripción                                               |
| :------ | :------------------------- | :---- | :----------------- | :----------------------------- | :-------------------------------------------------------- |
| `POST`  | `/messages`                | 🔒 Sí | `application/json` | `orderId`, `content`, `status` | Guardar un nuevo mensaje asociado a un pedido             |
| `GET`   | `/messages/order/:orderId` | 🔒 Sí | -                  | Param: `orderId`               | Obtener historial de mensajes de un pedido                |
| `PATCH` | `/messages/:id/status`     | 🔒 Sí | `application/json` | Param: `id` + `status`         | Actualizar estado (`SENT`, `DELIVERED`, `READ`, `FAILED`) |

## 🧾 6. Comprobantes (`/receipts`)

| Método  | Endpoint                      | Auth  | Content-Type          | Parámetros / Body                                              | Descripción                                                          |
| :------ | :---------------------------- | :---- | :-------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------- |
| `POST`  | `/receipts/:orderId/upload`   | 🔒 Sí | `multipart/form-data` | Param: `orderId` + File: `image`, `extractedAmount` (opcional) | Subir comprobante y pasar orden a `IN_REVIEW`                        |
| `GET`   | `/receipts/:orderId`          | 🔒 Sí | -                     | Param: `orderId`                                               | Obtener el comprobante y detalle de orden                            |
| `PATCH` | `/receipts/:orderId/validate` | 🔒 Sí | `application/json`    | Param: `orderId` + `status: VALIDATED \| REJECTED`             | Validar comprobante (marca `PAID`, descuenta stock y registra `OUT`) |

---

## 📊 7. Inventario (`/inventory`)

| Método | Endpoint                        | Auth  | Content-Type       | Parámetros / Body                                                | Descripción                                     |
| :----- | :------------------------------ | :---- | :----------------- | :--------------------------------------------------------------- | :---------------------------------------------- |
| `GET`  | `/inventory/product/:productId` | 🔒 Sí | -                  | Param: `productId`                                               | Obtener historial de movimientos de un producto |
| `POST` | `/inventory/movement`           | 🔒 Sí | `application/json` | `productId`, `quantity`, `movementType: IN \| OUT \| ADJUSTMENT` | Registrar movimiento manual de stock            |
