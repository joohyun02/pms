import app from "./app.js";
// import taskRoutes from "./routes/task.routes.js";
import "dotenv/config";
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 PMS backend server running on http://localhost:${PORT}`);
});
// app.use("/tasks", taskRoutes);