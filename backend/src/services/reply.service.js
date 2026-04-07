import prisma from "../prisma.js";

export async function addReplyService(displayId, data, currentUserId) {
  const { content, nextStatus } = data;

  const task = await prisma.task.findFirst({
    where: { displayId, isDeleted: false },
  });

  if (!task) throw new Error("지시카드 없음");

  // 🔥 현재 유저 DB 조회 (토큰 신뢰하지 않음)
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  });

  if (!currentUser) throw new Error("유저 없음");

  const isAdmin = currentUser.level === "ADMIN";
  const isAssigner = task.assignerId === currentUserId;
  const isAssignee = task.assigneeId === currentUserId;

  // 🔥 permission 테이블 확인
  const permission = await prisma.replyPermission.findUnique({
    where: {
      taskId_userId: {
        taskId: task.id,
        userId: currentUserId,
      },
    },
  });

  const hasPermission = !!permission;

  // 🔥 댓글 권한 체크
  if (!isAdmin && !isAssigner && !isAssignee && !hasPermission) {
    throw new Error("Reply 권한 없음");
  }

  // 🔥 상태 변경 여부 계산
  const isStatusChanged =
    nextStatus && nextStatus !== task.status;

  // 🔥 ADMIN이 아닌 경우 상태 변경 제한
  if (!isAdmin && isStatusChanged) {

    if (isAssignee && !["진행중", "완료보고"].includes(nextStatus)) {
      throw new Error("담당자는 해당 상태로 변경 불가");
    }

    if (isAssigner && !["보완요청", "결재완료"].includes(nextStatus)) {
      throw new Error("지시자는 해당 상태로 변경 불가");
    }

    // 🔥 permission 받은 사람은 상태 변경 불가
    if (!isAssignee && !isAssigner) {
      throw new Error("상태 변경 권한 없음");
    }
  }

  // 🔥 Reply 생성
  const reply = await prisma.reply.create({
    data: {
      taskId: task.id,
      writerId: currentUserId,
      content,
      nextStatus: nextStatus || task.status,
      statusChanged: isStatusChanged,
    },
  });

  // 🔥 실제 상태 변경이 있을 때만 Task 업데이트
  if (isStatusChanged) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: nextStatus,
        completedAt:
          nextStatus === "결재완료"
            ? new Date()
            : task.completedAt,
      },
    });
  }

  return reply;
}