import prisma from "../prisma.js";

export async function addCommentService(displayId, data, currentUserId) {
  const { content } = data;

  if (!content || !content.trim()) {
    throw new Error("내용 입력");
  }

  const task = await prisma.task.findFirst({
    where: { displayId, isDeleted: false },
  });

  if (!task) {
    throw new Error("지시카드 없음");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  });

  if (!currentUser) {
    throw new Error("유저 없음");
  }

  const isAdmin = currentUser.level === "ADMIN";

  const member = await prisma.taskMember.findFirst({
    where: {
      taskId: task.id,
      userId: currentUserId,
    },
  });

  if (!isAdmin && !member) {
    throw new Error("의견 권한 없음");
  }

  return await prisma.comment.create({
    data: {
      taskId: task.id,
      writerId: currentUserId,
      content: content.trim(),
    },
    include: {
      writer: {
        select: {
          id: true,
          name: true,
          level: true,
        },
      },
    },
  });
}