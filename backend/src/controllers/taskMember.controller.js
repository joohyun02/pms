import prisma from "../prisma.js";

export const listTaskMembers = async (req, res) => {
  const { displayId } = req.params;

  const task = await prisma.task.findFirst({
    where: { displayId, isDeleted: false },
    select: { id: true },
  });
  if (!task) return res.status(404).json({ message: "Task not found" });

  const members = await prisma.taskMember.findMany({
    where: { taskId: task.id },
    include: { user: { select: { id: true, name: true, email: true, level: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ taskId: task.id, members });
};

export const setTaskMembers = async (req, res) => {
  const { displayId } = req.params;
  const currentUserId = req.user.userId;
  const { userIds } = req.body; // 최종 선택된 멤버들 (OWNER 제외한 MEMBER들로 사용)

  const task = await prisma.task.findFirst({
    where: { displayId, isDeleted: false },
    select: { id: true },
  });
  if (!task) return res.status(404).json({ message: "Task not found" });

  // OWNER 확인
  const owner = await prisma.taskMember.findFirst({
    where: { taskId: task.id, userId: currentUserId, role: "OWNER" },
  });
  const dbUser = await prisma.user.findUnique({ where: { id: currentUserId } });
  const isAdmin = dbUser?.level === "ADMIN";

  if (!isAdmin && !owner) return res.status(403).json({ message: "팀원 관리 권한 없음" });

  // 현재 멤버 조회 (OWNER 제외)
  const currentMembers = await prisma.taskMember.findMany({
    where: { taskId: task.id, role: "MEMBER" },
    select: { userId: true },
  });
  const currentSet = new Set(currentMembers.map((m) => m.userId));
  const nextSet = new Set(userIds || []);

  const toAdd = [];
  const toRemove = [];

  for (const id of nextSet) if (!currentSet.has(id)) toAdd.push(id);
  for (const id of currentSet) if (!nextSet.has(id)) toRemove.push(id);

  // 추가
  for (const uid of toAdd) {
    try {
      await prisma.taskMember.create({
        data: { taskId: task.id, userId: uid, role: "MEMBER" },
      });
    } catch (e) {
      if (e.code !== "P2002") throw e;
    }
  }

  // 제거
  if (toRemove.length > 0) {
    await prisma.taskMember.deleteMany({
      where: { taskId: task.id, role: "MEMBER", userId: { in: toRemove } },
    });
  }

  res.json({ message: "팀원 저장 완료" });
};


export const changeTaskOwner = async (req, res) => {
  try {
    const { displayId } = req.params;
    const { newOwnerId } = req.body;
    const currentUserId = req.user.userId;

    const task = await prisma.task.findFirst({
      where: { displayId, isDeleted: false },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    const isAdmin = currentUser?.level === "ADMIN";

    const currentOwner = await prisma.taskMember.findFirst({
      where: {
        taskId: task.id,
        userId: currentUserId,
        role: "OWNER",
      },
    });

    if (!isAdmin && !currentOwner) {
      return res.status(403).json({ message: "OWNER 변경 권한 없음" });
    }

    const targetMember = await prisma.taskMember.findFirst({
      where: {
        taskId: task.id,
        userId: newOwnerId,
      },
    });

    if (!targetMember) {
      return res.status(400).json({ message: "해당 사용자는 팀원이 아닙니다" });
    }

    await prisma.$transaction([
      prisma.taskMember.updateMany({
        where: {
          taskId: task.id,
          role: "OWNER",
        },
        data: {
          role: "MEMBER",
        },
      }),
      prisma.taskMember.update({
        where: {
          id: targetMember.id,
        },
        data: {
          role: "OWNER",
        },
      }),
      prisma.task.update({
        where: {
          id: task.id,
        },
        data: {
          leaderId: newOwnerId,
        },
      }),
    ]);

    res.json({ message: "OWNER 변경 완료" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "OWNER 변경 실패" });
  }
};