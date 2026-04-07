import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { listUsers, approveUser, rejectUser, listPendingUsers } from "../controllers/user.controller.js";

const router = Router();

router.get("/", authMiddleware, listUsers);
router.get("/pending", authMiddleware, listPendingUsers);
router.post("/:userId/approve", authMiddleware, approveUser);
router.post("/:userId/reject", authMiddleware, rejectUser);

export default router;