import express from "express";
import cors from "cors";
import path from "path";
import taskRoutes from "./routes/task.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import permissionRoutes from "./routes/permission.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/tasks", taskRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/permissions", permissionRoutes);
app.use("/notifications", notificationRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/attachments", attachmentRoutes);

export default app;

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "서버 오류" });
});