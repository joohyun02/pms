export async function getDashboardService(query, currentUserId) {
  const { q, showDeleted, view, team } = query;

  const where = {
    isDeleted: showDeleted === "true",
  };

  // 내 업무 보기
  if (view === "mine" && currentUserId) {
    where.members = {
      some: {
        userId: currentUserId,
      },
    };
  }

  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q } },
          { displayId: { contains: q } },
        ],
      },
    ];
  }

  // 팀 필터
  if (team) {
    where.members = {
      ...(where.members || {}),
      some: {
        ...(where.members?.some || {}),
        user: {
          team,
        },
      },
    };
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

  return {
    summary: {
      total: tasks.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      completed: completed.length,
      nearDue: nearDue.length,
    },
    tasks: { inProgress, overdue, completed, nearDue },
  };
}