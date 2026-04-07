import express from "express";
import {
  grantReplyPermission,
  revokeReplyPermission,
} from "../controllers/permission.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/grant", authMiddleware, grantReplyPermission);
router.post("/revoke", authMiddleware, revokeReplyPermission);

export default router;