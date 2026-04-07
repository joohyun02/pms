import prisma from "../prisma.js";
import { generateTaskId } from "../utils/idGenerator.js";

export async function createTaskService(data) {
  const { title, content, leaderId, memberIds = [], dueAt } = data;

  if (!title || !content || !leaderId || !dueAt) {
    throw new Error("필수값 누락");
  }

  const task = await prisma.task.create({
    data: {
      displayId: generateTaskId(),
      title,
      content,
      leaderId,
      dueAt: new Date(dueAt),
      status: "지시등록",
    },
  });

  // 🔥 OWNER 추가
  await prisma.taskMember.create({
    data: {
      taskId: task.id,
      userId: leaderId,
      role: "OWNER",
    },
  });

  // 🔥 MEMBER 추가
  // 🔥 MEMBER 추가 (안전 버전)
for (const userId of memberIds) {
  if (userId === leaderId) continue;

  try {
    await prisma.taskMember.create({
      data: {
        taskId: task.id,
        userId,
        role: "MEMBER",
      },
    });
  } catch (e) {
    // 중복이면 무시
    if (e.code !== "P2002") throw e;
  }
}

  return task;
}

export async function getTaskByDisplayIdService(displayId, currentUserId) {

  const task = await prisma.task.findFirst({
    where: { displayId, isDeleted: false },
    include: {
      leader: true,

      members: {
        include: {
          user: { select: { id: true, name: true, level: true } },
        },
      },

      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          writer: { select: { id: true, name: true, level: true } },
        },
      },

      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: {
          changer: { select: { id: true, name: true, level: true } },
        },
      },

      attachments: {
        orderBy: {createdAt: "desc"},
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              team: true,
            },
          },
        },
      },
    },
  });

  if (!task) throw new Error("지시카드 없음");

  if (!currentUserId) {
    return { ...task, canComment: false };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  });

  const isAdmin = currentUser?.level === "ADMIN";

  const member = await prisma.taskMember.findFirst({
    where: {
      taskId: task.id,
      userId: currentUserId,
    },
  });

  const canComment = isAdmin || !!member;

  return {
    ...task,
    canComment,
  };
}

export async function getDashboardService(query, currentUserId) {
  const { q, showDeleted, view, team } = query;

  const where = {
    isDeleted: showDeleted === "true",
    AND: [],
  };

  if (view === "mine" && currentUserId) {
    where.AND.push({
      members: {
        some: {
          userId: currentUserId,
        },
      },
    });
  }

  if (team) {
    where.AND.push({
      members: {
        some: {
          user: {
            team: team,
          },
        },
      },
    });
  }

  if (q) {
    where.AND.push({
      OR: [
        { title: { contains: q } },
        { displayId: { contains: q } },
      ],
    });
  }

  if (where.AND.length === 0) {
    delete where.AND;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      leader: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              level: true,
              team: true,
            },
          },
        },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  const now = new Date();
  const inProgress = [];
  const overdue = [];
  const completed = [];
  const nearDue = [];

  for (const task of tasks) {
    const dueTime = new Date(task.dueAt).getTime();
    const timeLeft = dueTime - now.getTime();

    if (task.status === "결재완료") {
      completed.push(task);
    } else if (dueTime < now.getTime()) {
      overdue.push(task);
    } else {
      inProgress.push(task);
      if (timeLeft <= 24 * 60 * 60 * 1000) {
        nearDue.push(task);
      }
    }
  }

  let notifications = [];

  if (currentUserId) {
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        level: true,
      },
    });

    const canApproveSignup =
      currentUser?.level === "대표" || currentUser?.level === "이사";

    if (canApproveSignup) {
      const pendingUsers = await prisma.user.findMany({
        where: {
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      const signupNotifications = pendingUsers.map((u) => ({
        id: `signup-${u.id}`,
        type: "signup",
        userId: u.id,
        text: `${u.name}님 회원가입 승인 요청`,
        taskDisplayId: "-",
        taskTitle: u.email,
        createdAt: u.createdAt,
      }));

      notifications = [...signupNotifications];
    }
  }

  return {
    summary: {
      total: tasks.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      completed: completed.length,
      nearDue: nearDue.length,
    },
    tasks: { inProgress, overdue, completed, nearDue },
    notifications,
  };
}