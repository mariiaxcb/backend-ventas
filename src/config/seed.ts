import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Admin', 10)

  await prisma.admin.upsert({
    where: { username: 'Admin' },
    update: {},
    create: {
      username: 'Admin',
      password: hashedPassword,
      status: 'ACTIVE',
    },
  })
}

main()
  .catch((e) => {
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
