import express from "express";
import upload from "../middleware/upload.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { 
    uploadAttachment,
    downloadAttachment,
    deleteAttachment,
} from "../controllers/attachment.controller.js";

const router = express.Router();

router.post("/:displayId", authMiddleware, upload.single("file"), uploadAttachment);
router.get("/download/:attachmentId", authMiddleware, downloadAttachment);
router.delete("/:attachmentId", authMiddleware, deleteAttachment);

export default router;