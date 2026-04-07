import prisma from "../prisma.js";
import path from "path";
import fs from "fs";

export async function uploadAttachment(req, res) {
  try {
    const { displayId } = req.params;
    const currentUserId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ message: "파일이 없습니다." });
    }

    const task = await prisma.task.findFirst({
      where: { displayId, isDeleted: false },
    });

    if (!task) {
      return res.status(404).json({ message: "지시카드 없음" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "유저 없음" });
    }

    const isAdmin = currentUser.level === "ADMIN";

    const member = await prisma.taskMember.findFirst({
      where: {
        taskId: task.id,
        userId: currentUserId,
      },
    });

    if (!isAdmin && !member) {
      return res.status(403).json({ message: "파일 업로드 권한 없음" });
    }

    const originalName = req.file.originalname
      ? Buffer.from(req.file.originalname, "latin1").toString("utf8")
      : req.file.filename;

    const attachment = await prisma.attachment.create({
      data: {
        taskId: task.id,
        uploaderId: currentUserId,
        originalName,
        storedName: req.file.filename,
        filePath: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            team: true,
          },
        },
      },
    });

    return res.status(201).json(attachment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "파일 업로드 실패" });
  }
}

export async function downloadAttachment(req, res) {
  try {
    const { attachmentId } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return res.status(404).json({ message: "첨부파일 없음" });
    }

    const fileName = path.basename(attachment.filePath);
    const fullPath = path.join(process.cwd(), "uploads", fileName);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "서버 파일 없음" });
    }

    return res.download(fullPath, attachment.originalName);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "파일 다운로드 실패" });
  }
}

export async function deleteAttachment(req, res) {
    try {
        const { attachmentId } = req.params;
        const currentUserId = req.user.userId;

        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: {
                task: {
                    include: {
                        members: true,
                    },
                },
            },
        });

        if (!attachment) {
            return res.status(404).json({ message: "첨부파일 없음"});
        }
        
        const currentUser = await prisma.user.findUnique({
            where: { id: currentUserId },
        });

        if (!currentUser) {
            return res.status(404).json({ message: "유저 없음"});
        }

        const isAdmin = currentUser.level === "ADMIN";

        const myMember = attachment.task.members.find(
            (m) => m.userId === currentUserId
        );

        const isOwner = myMember?.role === "OWNER";
        const isUploader = attachment.uploaderId === currentUserId;

        if(!isAdmin && !isOwner && !isUploader ) {
            return res.status(403).json({ message: "파일 삭제 권한 없음" });
        }

        const fileName = path.basename(attachment.filePath);
        const fullPath = path.join(process.cwd(), "uploads", fileName);

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        await prisma.attachment.delete({
            where: { id: attachmentId },
        });

        return res.status(200).json({ message: "파일 삭제 완료 "});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "파일 삭제 실패"});
    }   
}