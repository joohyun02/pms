import prisma from "./prisma.js";
import bcrypt from "bcrypt";

async function main() {
  const users = [
    {
      email: "admin",
      password: "1234",
      name: "박항준",
      level: "대표",
      team: "관리팀",
    },
    {
      email: "manager",
      password: "1234",
      name: "곽재준",
      level: "이사",
      team: "관리팀",
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        level: user.level,
        team: user.team,
        status: "APPROVED",
        approvedAt: new Date(),
      },
      create: {
        email: user.email,
        password: hashedPassword,
        name: user.name,
        level: user.level,
        team: user.team,
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
  }

  console.log("✅ 기본 사용자 생성 완료");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());