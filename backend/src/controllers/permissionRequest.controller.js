import prisma from "../prisma.js";
export const requestPermission = async (req, res) => {
  try {
    const { displayId } = req.params;
    const currentUserId = req.user.userId;

    const task = await prisma.task.findFirst({
      where: { displayId, isDeleted: false },
    });

    if (!task)
      return res.status(404).json({ message: "Task not found" });

    const exists = await prisma.permissionRequest.findFirst({
      where: {
        taskId: task.id,
        requesterId: currentUserId,
        status: "PENDING",
      },
    });

    if (exists)
      return res.status(400).json({ message: "이미 요청됨" });

    await prisma.permissionRequest.create({
      data: {
        taskId: task.id,
        requesterId: currentUserId,
      },
    });

    res.json({ message: "권한 요청 완료" });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "요청 실패" });
  }
};



// 🔥 요청 목록 조회
export const listPermissionRequests = async (req, res) => {
  try {
    const { displayId } = req.params;

    const task = await prisma.task.findFirst({
      where: { displayId, isDeleted: false },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    const requests = await prisma.permissionRequest.findMany({
      where: {
        taskId: task.id,
        status: "PENDING",
      },
      include: {
        requester: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(requests);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "요청 목록 조회 실패" });
  }
};

// 🔥 승인 (TaskMember OWNER 기준)
export const approvePermission = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user.userId;

    const request = await prisma.permissionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request)
      return res.status(404).json({ message: "요청 없음" });

    const task = await prisma.task.findUnique({
      where: { id: request.taskId },
    });

    if (!task)
      return res.status(404).json({ message: "Task 없음" });

    // 🔥 OWNER 확인
    const member = await prisma.taskMember.findFirst({
      where: {
        taskId: task.id,
        userId: currentUserId,
      },
    });

    const isOwner = member?.role === "OWNER";

    if (!isOwner)
      return res.status(403).json({ message: "승인 권한 없음" });

    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "이미 처리된 요청" });
    }

    // 🔥 TaskMember로 팀 합류
    await prisma.taskMember.create({
      data: {
        taskId: task.id,
        userId: request.requesterId,
        role: "MEMBER",
      },
    });

    // 🔥 요청 상태 변경
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

// 🔥 거절
export const rejectPermission = async (req, res) => {
  try {
    const { requestId } = req.params;

    await prisma.permissionRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    res.json({ message: "거절 완료" });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "거절 실패" });
  }
};