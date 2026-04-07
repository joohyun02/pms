import { addReplyService } from "../services/reply.service.js";

export async function addReply(req, res) {
  try {
    const { displayId } = req.params;
    const currentUserId = req.user?.userId; // 🔥 authMiddleware에서 세팅됨

    const reply = await addReplyService(displayId, req.body, currentUserId);

    res.status(201).json(reply);
  } catch (e) {
    console.error(e);

    const status =
      e.message === "Reply 권한 없음" ? 403 :
      e.message === "지시카드 없음" ? 404 :
      400;

    res.status(status).json({
      message: "Reply 생성 실패",
      error: e.message,
    });
  }
}