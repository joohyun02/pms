import prisma from "../prisma.js";


// 🔹 Reply 권한 부여 (멀티)
export const grantReplyPermission = async (req, res) => {
  try {
    const { taskId, userIds } = req.body;
    const currentUserId = req.user.userId;

    // 🔥 1. Task 존재 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 🔥 2. 현재 유저 DB 조회 (정석)
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isAdmin = dbUser.level === "ADMIN";
    const isAssigner = task.assignerId === currentUserId;

    if (!isAdmin && !isAssigner) {
      return res.status(403).json({ message: "권한 부여 불가" });
    }

    // 🔥 3. userIds 실제 존재하는 유저만 필터링
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: { id: true },
    });

    if (validUsers.length === 0) {
      return res.status(400).json({ message: "유효한 사용자 없음" });
    }

    // 🔥 4. SQLite 대응 (createMany + skipDuplicates 불가)
    for (const user of validUsers) {
      try {
        await prisma.replyPermission.create({
          data: {
            taskId,
            userId: user.id,
          },
        });
      } catch (err) {
        // 이미 존재하는 경우(P2002) 무시
        if (err.code !== "P2002") {
          throw err;
        }
      }
    }

    res.json({ message: "Reply 권한 부여 완료" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};



// 🔹 Reply 권한 회수 (멀티)
export const revokeReplyPermission = async (req, res) => {
  try {
    const { taskId, userIds } = req.body;
    const currentUserId = req.user.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isAdmin = dbUser.level === "ADMIN";
    const isAssigner = task.assignerId === currentUserId;

    if (!isAdmin && !isAssigner) {
      return res.status(403).json({ message: "권한 회수 불가" });
    }

    await prisma.replyPermission.deleteMany({
      where: {
        taskId,
        userId: { in: userIds },
      },
    });

    res.json({ message: "Reply 권한 회수 완료" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

// 권한 요청
export const listReplyPermissions = async (req, res) => {
  try {
    const { displayId } = req.params;
    const currentUserId = req.user.userId;

    const task = await prisma.task.findFirst({
      where: { displayId, isDeleted: false },
      select: { id: true, assignerId: true },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, level: true },
    });

    const isAdmin = dbUser?.level === "ADMIN";
    const isAssigner = task.assignerId === currentUserId;

    if (!isAdmin && !isAssigner) {
      return res.status(403).json({ message: "조회 권한 없음" });
    }

    const rows = await prisma.replyPermission.findMany({
      where: { taskId: task.id },
      select: { userId: true },
    });

    res.json({ taskId: task.id, userIds: rows.map((r) => r.userId) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "권한 목록 조회 실패" });
  }
};

// 권한 승인
export const approvePermission = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user.userId;

    const request = await prisma.permissionRequest.findUnique({
      where: { id: requestId },
      include: { task: true },
    });

    if (!request)
      return res.status(404).json({ message: "요청 없음" });

    // 🔥 지시자만 승인 가능
    const member = await prisma.taskMember.findFirst({
      where: {
        taskId: request.taskId,
        userId: currentUserId,
      },
    });

    if (!member || member.role !== "OWNER") {
      return res.status(403).json({ message: "승인 권한 없음"});
    }
    
    // 🔥 이미 승인된 경우 방지
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "이미 처리된 요청" });
    }

    // 1️⃣ 권한 생성
    await prisma.replyPermission.create({
      data: {
        taskId: request.taskId,
        userId: request.requesterId,
      },
    });

    // 2️⃣ 요청 상태 변경
    await prisma.permissionRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    });

    res.json({ message: "승인 완료" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "승인 실패" });
  }
};