import { getDashboardService } from "../services/dashboard.service.js";

export async function getDashboard(req, res) {
  try {
    const data = await getDashboardService();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "대시보드 조회 실패" });
  }
}
