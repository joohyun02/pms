import prisma from "../prisma.js";

async function main() {
  const tasks = await prisma.task.findMany({
    where: { isDeleted: false },
    select: { id: true, assignerId: true, assigneeId: true },
  });

  for (const t of tasks) {
    // OWNER = assigner
    try {
      await prisma.taskMember.create({
        data: { taskId: t.id, userId: t.assignerId, role: "OWNER" },
      });
    } catch (e) {
      if (e.code !== "P2002") throw e;
    }

    // MEMBER = assignee
    try {
      await prisma.taskMember.create({
        data: { taskId: t.id, userId: t.assigneeId, role: "MEMBER" },
      });
    } catch (e) {
      if (e.code !== "P2002") throw e;
    }
  }

  console.log("✅ TaskMember 동기화 완료");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());