const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

async function createAdmin() {
  const password = await bcrypt.hash("admin123", 10);

  const existingAdmin = await prisma.user.findUnique({
    where: {
      username: "admin"
    }
  });

  if (existingAdmin) {
    console.log("Admin already exists");
    return;
  }

  await prisma.user.create({
    data: {
      username: "admin",
      password
    }
  });

  console.log("Admin created successfully");
}

createAdmin()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });