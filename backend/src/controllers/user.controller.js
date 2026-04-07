import prisma from "../prisma.js";

export async function listUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: "APPROVED", // 승인된 사용자만
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        level: true,
        team: true,
      },
      orderBy:[ 
        { team: "asc"},
        { createdAt: "asc" },
        ]
    });
    
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "유저 목록 조회 실패" });
  }
}

function canApprove(currentUser) {
  return currentUser?.level === "대표" || currentUser?.level === "이사";
}

export async function listPendingUsers(req, res) {
  try {
    const currentUserId = req.user.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!canApprove(currentUser)) {
      return res.status(403).json({ message: "권한 없음" });
    }

    const users = await prisma.user.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
        team: true,
        status: true,
        createdAt: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "대기 회원 조회 실패" });
  }
}

export async function approveUser(req, res) {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!canApprove(currentUser)) {
      return res.status(403).json({ message: "권한 없음" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "사용자 없음" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: currentUserId,
      },
    });

    res.json({ message: "회원 승인 완료" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "회원 승인 실패" });
  }
}

export async function rejectUser(req, res) {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!canApprove(currentUser)) {
      return res.status(403).json({ message: "권한 없음" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "사용자 없음" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "REJECTED",
        approvedAt: null,
        approvedById: null,
      },
    });

    res.json({ message: "회원 거절 완료" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "회원 거절 실패" });
  }
}