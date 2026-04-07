import { Router } from "express";
import { createTask, getTaskByDisplayId, getDashboard } from "../controllers/task.controller.js";
import { addReply } from "../controllers/reply.controller.js";
import { softDeleteTask, restoreTask } from "../controllers/task.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { addComment, updateComment, deleteComment } from "../controllers/comment.controller.js";
import { changeStatus } from "../controllers/status.controller.js";
import { listReplyPermissions } from "../controllers/permission.controller.js";
import {
  requestPermission,
  listPermissionRequests,
  approvePermission,
  rejectPermission,
} from "../controllers/permissionRequest.controller.js";

import {
  listTaskMembers,
  setTaskMembers,
  changeTaskOwner,
} from "../controllers/taskMember.controller.js";





const router = Router();

// 🔥 대시보드
router.get("/dashboard", authMiddleware, getDashboard);

// 🔥 단건 조회
router.get("/:displayId", authMiddleware, getTaskByDisplayId);

// 🔥 생성
router.post("/", authMiddleware, createTask);

// 🔥 Reply
router.post("/:displayId/replies", authMiddleware, addReply);

// 🔥 삭제 / 복구
router.patch("/:displayId/delete", authMiddleware, softDeleteTask);
router.patch("/:displayId/restore", authMiddleware, restoreTask);

router.post("/:displayId/comments", authMiddleware, addComment);
router.post("/:displayId/status", authMiddleware, changeStatus);

router.get("/:displayId/permissions", authMiddleware, listReplyPermissions);


router.post("/:displayId/permission-request", authMiddleware, requestPermission);
router.post("/permission-request/:requestId/approve", authMiddleware, approvePermission);
router.post("/permission-request/:requestId/reject", authMiddleware, rejectPermission);

router.get("/:displayId/permission-requests", authMiddleware, listPermissionRequests);

router.get("/:displayId/members", authMiddleware, listTaskMembers);
router.post("/:displayId/members", authMiddleware, setTaskMembers);
router.post("/:displayId/change-owner", authMiddleware, changeTaskOwner);

router.patch("/comments/:commentId", authMiddleware, updateComment);
router.delete("/comments/:commentId", authMiddleware, deleteComment);
export default router;