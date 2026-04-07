import { changeStatusService } from "../services/status.service.js";

export async function changeStatus(req, res) {
  try {
    const { displayId } = req.params;
    const currentUserId = req.user.userId;
    const { toStatus, content } = req.body;

    await changeStatusService(displayId, toStatus, content, currentUserId);

    res.status(200).json({ message: "상태 변경 완료" });
  } catch (e) {
    const status =
      e.message.includes("권한") ? 403 :
      e.message === "지시카드 없음" ? 404 :
      400;

    res.status(status).json({ message: e.message });
  }
}