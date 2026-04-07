import { createTaskService, getTaskByDisplayIdService, getDashboardService } from "../services/task.service.js";
import prisma from "../prisma.js";

export async function getDashboard(req, res) {
  try {
    const currentUserId = req.user?.userId;
    const data = await getDashboardService(req.query, currentUserId);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "대시보드 조회 실패" });
  }
}

export async function createTask(req, res) {
  try {
    const task = await createTaskService(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "지시카드 생성 실패", error: error.message });
  }
}

export async function getTaskByDisplayId(req, res) {
  try {
    const currentUserId = req.user?.userId;
    const { displayId } = req.params;
    const task = await getTaskByDisplayIdService(displayId, currentUserId);

    if (!task) {
      return res.status(404).json({ message: "지시카드를 찾을 수 없습니다." });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "조회 실패" });
  }
}

export async function softDeleteTask(req, res) {
  try {
    const { displayId } = req.params;
    const currentUserId = req.user.userId;

    const task = await prisma.task.findFirst({
      where: { displayId, isDeleted: false },
    });

    if (!task) {
      return res.status(404).json({ message: "지시카드 없음" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "유저 없음" });
    }

    const isAdmin = currentUser.level === "ADMIN";

    const member = await prisma.taskMember.findFirst({
      where: {
        taskId: task.id,
        userId: currentUserId,
      },
    });

    const isOwner = member?.role === "OWNER";

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "삭제 권한 없음" });
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { isDeleted: true },
    });

    res.json({ message: "삭제 완료" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "삭제 실패" });
  }
}

export async function restoreTask(req, res) {
  try {
    const { displayId } = req.params;

    await prisma.task.update({
      where: { displayId },
      data: { isDeleted: false },
    });

    res.json({ message: "복구 완료" });
  } catch (error) {
    res.status(500).json({ message: "복구 실패" });
  }
}