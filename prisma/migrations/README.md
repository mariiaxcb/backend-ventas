Las migraciones se generan automáticamente al ejecutar:

    npx prisma migrate dev --name init

Esto creará una carpeta con timestamp (ej. 20260804000000_init) conteniendo el SQL autogenerado a partir de schema.prisma.
