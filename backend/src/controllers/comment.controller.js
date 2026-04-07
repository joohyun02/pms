import { addCommentService } from "../services/comment.service.js";
import prisma from "../prisma.js";

export async function addComment(req, res) {
  try {
    const { displayId } = req.params;
    const currentUserId = req.user?.userId;

    const comment = await addCommentService(displayId, req.body, currentUserId);

    res.status(201).json(comment);
  } catch (e) {
    console.error(e);

    const status =
      e.message === "의견 권한 없음" ? 403 :
      e.message === "지시카드 없음" ? 404 :
      400;

    res.status(status).json({
      message: "의견 등록 실패",
      error: e.message,
    });
  }
}

export async function updateComment(req, res) {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "내용 입력" });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        writer: true,
      },
    });

    if (!comment) {
      return res.status(404).json({ message: "댓글 없음" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "유저 없음" });
    }

    const isAdmin = currentUser.level === "ADMIN";
    const isWriter = String(comment.writerId) === String(currentUserId);

    if (!isAdmin && !isWriter) {
      return res.status(403).json({ message: "댓글 수정 권한 없음" });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
      },
      include: {
        writer: {
          select: {
            id: true,
            name: true,
            team: true,
          },
        },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "댓글 수정 실패" });
  }
}


export async function deleteComment(req, res) {
  try {
    const { commentId } = req.params;
    const currentUserId = req.user.userId;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ message: "댓글 없음" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "유저 없음" });
    }

    const isAdmin = currentUser.level === "ADMIN";
    const isWriter = String(comment.writerId) === String(currentUserId);

    if (!isAdmin && !isWriter) {
      return res.status(403).json({ message: "댓글 삭제 권한 없음" });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return res.status(200).json({ message: "댓글 삭제 완료" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "댓글 삭제 실패" });
  }
}