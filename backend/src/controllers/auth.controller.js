import { loginService, registerService } from "../services/auth.service.js";

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ message: e.message });
  }
}

export async function register(req, res) {
  try {
    const { email, password, name, level, team } = req.body;
    const result = await registerService(email, password, name, level, team);
    res.status(201).json({
      message: "회원가입 신청 완료. 대표 또는 이사 승인 후 로그인 가능합니다.",
      user: result,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}