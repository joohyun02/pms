import prisma from "../prisma.js";

export async function changeStatusService(displayId, toStatus, content, currentUserId) {
  // 1️⃣ Task 조회
  const task = await prisma.task.findFirst({
    where: { displayId, isDeleted: false },
  });

  if (!task) throw new Error("지시카드 없음");

  // 2️⃣ 현재 유저 확인
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  });

  if (!currentUser) throw new Error("유저 없음");

  const isAdmin = currentUser.level === "ADMIN";

  // 3️⃣ 🔥 TaskMember 기반 권한 판단
  const member = await prisma.taskMember.findFirst({
    where: {
      taskId: task.id,
      userId: currentUserId,
    },
  });

  const isOwner = member?.role === "OWNER";
  const isMember = member?.role === "MEMBER";

  // OWNER 또는 MEMBER 또는 ADMIN만 상태 변경 가능
  if (!isAdmin && !isOwner && !isMember) {
    throw new Error("상태 변경 권한 없음");
  }

  // 4️⃣ 상태 유효성 체크
  if (!toStatus || toStatus === task.status) {
    throw new Error("변경할 상태 선택");
  }

  if (!content || !content.trim()) {
    throw new Error("상태 변경 설명 필수");
  }

  const fromStatus = task.status;

  // 5️⃣ 상태 업데이트
  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: toStatus,
      completedAt:
        toStatus === "결재완료" ? new Date() : task.completedAt,
    },
  });

  // 6️⃣ 상태 이력 기록
  await prisma.statusHistory.create({
    data: {
      taskId: task.id,
      changerId: currentUserId,
      fromStatus,
      toStatus,
      comment: content,
    },
  });

  return true;
}