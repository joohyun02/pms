import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

const ALLOWED_LEVELS = ["팀장", "팀원"];
const ALLOWED_TEAMS = ["관리팀", "개발팀", "기획팀", "디자인팀"];

function normalizeText(value) {
  return String(value || "").trim();
}

export async function loginService(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  if (user.status === "PENDING") {
    throw new Error("승인 대기 중입니다.");
  }

  if (user.status === "REJECTED") {
    throw new Error("가입이 거절된 계정입니다.");
  }

  if (!SECRET) {
    throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다.");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.level,
    },
    SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      level: user.level,
      team: user.team,
      status: user.status,
    },
  };
}

export async function registerService(email, password, name, level, team) {
  const safeEmail = normalizeText(email).toLowerCase();
  const safePassword = String(password || "");
  const safeName = normalizeText(name);
  const safeLevel = normalizeText(level);
  const safeTeam = normalizeText(team);

  if (!safeEmail || !safePassword || !safeName || !safeLevel || !safeTeam) {
    throw new Error("필수값 누락");
  }

  if (!ALLOWED_LEVELS.includes(safeLevel)) {
    throw new Error("직위는 팀장, 팀원만 선택할 수 있습니다.");
  }

  if (!ALLOWED_TEAMS.includes(safeTeam)) {
    throw new Error("팀은 관리팀, 개발팀, 기획팀, 디자인팀만 선택할 수 있습니다.");
  }

  if (safeLevel === "대표" && safeTeam !== "관리팀") {
    throw new Error("대표는 관리팀으로만 등록할 수 있습니다.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: safeEmail },
  });

  if (existing) {
    throw new Error("이미 존재하는 이메일입니다.");
  }

  const hashedPassword = await bcrypt.hash(safePassword, 10);

  const user = await prisma.user.create({
    data: {
      email: safeEmail,
      password: hashedPassword,
      name: safeName,
      level: safeLevel,
      team: safeTeam,
      status: "PENDING",
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    level: user.level,
    team: user.team,
    status: user.status,
  };
}