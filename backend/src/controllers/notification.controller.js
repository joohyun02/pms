import prisma from "../prisma.js";

export async function getNotifications(req, res) {
  try {
    const currentUserId = req.user.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "유저 없음" });
    }

    const isAdmin = currentUser.level === "ADMIN";

    const memberRows = await prisma.taskMember.findMany({
      where: { userId: currentUserId },
      select: { taskId: true, role: true },
    });

    const taskIds = memberRows.map((row) => row.taskId);
    const ownerTaskIds = memberRows
      .filter((row) => row.role === "OWNER")
      .map((row) => row.taskId);

    const pendingRequests = await prisma.permissionRequest.findMany({
      where: isAdmin
        ? { status: "PENDING" }
        : {
            status: "PENDING",
            taskId: { in: ownerTaskIds },
          },
      include: {
        requester: {
          select: { id: true, name: true, team: true },
        },
        task: {
          select: { id: true, displayId: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const comments = await prisma.comment.findMany({
      where: {
        taskId: { in: taskIds.length ? taskIds : ["__none__"] },
        writerId: { not: currentUserId },
      },
      include: {
        writer: {
          select: { id: true, name: true, team: true },
        },
        task: {
          select: { id: true, displayId: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const statusChanges = await prisma.statusHistory.findMany({
      where: {
        taskId: { in: taskIds.length ? taskIds : ["__none__"] },
        changerId: { not: currentUserId },
      },
      include: {
        changer: {
          select: { id: true, name: true, team: true },
        },
        task: {
          select: { id: true, displayId: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const notifications = [
      ...pendingRequests.map((r) => ({
        id: `request-${r.id}`,
        type: "request",
        createdAt: r.createdAt,
        taskDisplayId: r.task.displayId,
        taskTitle: r.task.title,
        text: `${r.requester.name} [${r.requester.team}] 님이 팀 참여를 요청했습니다.`,
      })),

      ...comments.map((c) => ({
        id: `comment-${c.id}`,
        type: "comment",
        createdAt: c.createdAt,
        taskDisplayId: c.task.displayId,
        taskTitle: c.task.title,
        text: `${c.writer.name} [${c.writer.team}] 님이 협업 의견을 등록했습니다.`,
      })),

      ...statusChanges.map((s) => ({
        id: `status-${s.id}`,
        type: "status",
        createdAt: s.createdAt,
        taskDisplayId: s.task.displayId,
        taskTitle: s.task.title,
        text: `${s.changer.name} [${s.changer.team}] 님이 상태를 ${s.fromStatus} → ${s.toStatus} 로 변경했습니다.`,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "알림 조회 실패" });
  }
}