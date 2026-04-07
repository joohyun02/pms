import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    level: "",
    team: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password || !form.name || !form.level || !form.team) {
      return alert("모든 항목 입력");
    }
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "회원가입 실패");
      }

      alert(result.message);
      navigate("/login");

      setForm({
        email: "",
        password: "",
        name: "",
        level: "",
        team: "",
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>회원가입</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            name="email"
            placeholder="이메일"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            name="name"
            placeholder="이름"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <select
            name="team"
            value={form.team}
            onChange={handleChange}
            style={{ width: "10%" }}
          >
            <option value="">팀 선택</option>
            <option value="관리팀">관리팀</option>
            <option value="개발팀">개발팀</option>
            <option value="기획팀">기획팀</option>
            <option value="디자인팀">디자인팀</option>
          </select>
        </div>

        <div>
          <select name="level" value={form.level} onChange={handleChange}>
            <option value="">직급 선택</option>
            <option value="팀장">팀장</option>
            <option value="팀원">팀원</option>
          </select>
        </div>

        <div style={{ marginTop: "10px" }}>
          <button type="submit" disabled={loading}>
            {loading ? "신청 중..." : "회원가입 신청"}
          </button>

          <br />

          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{ width: "15%" }}
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </form>
    </div>
  );
}