import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import { useNavigate } from "react-router-dom";

const TEAM_ORDER = ["관리팀", "개발팀", "기획팀", "디자인팀"];
const ALLOWED_TEAMS = ["관리팀", "개발팀", "기획팀", "디자인팀"];
const ALLOWED_LEVELS = ["대표", "이사", "팀장", "팀원"];
const LEGACY_HIDDEN_NAMES = ["manager", "개발팀장", "기획팀장", "디자인팀장"];

export default function CreateTask() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [users, setUsers] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    if (!user?.id) {
      alert("로그인 정보가 없습니다. 다시 로그인하세요.");
      navigate("/login");
      return;
    }
    loadUsers();
  }, [navigate, user?.id]);

  const loadUsers = async () => {
    try {
      const data = await apiFetch("/users");

      const cleaned = data.filter((u) => {
        if (!u) return false;

        const name = String(u.name || "").trim();
        const team = String(u.team || "").trim();
        const level = String(u.level || "").trim();

        if (String(u.id) === String(user?.id)) return false;
        if (!ALLOWED_TEAMS.includes(team)) return false;
        if (!ALLOWED_LEVELS.includes(level)) return false;
        if (LEGACY_HIDDEN_NAMES.includes(name)) return false;

        return true;
      });

      setUsers(cleaned);
    } catch (err) {
      alert(err.message || "유저 목록 불러오기 실패");
    }
  };

  const toggleMember = (userId) => {
    setMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const groupedUsers = useMemo(() => {
    const groups = {
      관리팀: [],
      개발팀: [],
      기획팀: [],
      디자인팀: [],
    };

    users.forEach((u) => {
      if (groups[u.team]) {
        groups[u.team].push(u);
      }
    });

    return groups;
  }, [users]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !content || !dueAt) {
      alert("모든 항목을 입력하세요.");
      return;
    }

    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          leaderId: user.id,
          memberIds,
          title,
          content,
          dueAt,
        }),
      });

      alert("프로젝트 생성 완료");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.message || "프로젝트 생성 실패");
    }
  };

  return (
    <div>
      <h1>프로젝트 생성</h1>

      <p>
        <b>리더:</b> {user?.name}
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>팀원 선택</label>
          <div style={{ border: "1px solid #ddd", padding: "10px" }}>
            {TEAM_ORDER.map((team) => {
              const teamUsers = groupedUsers[team] || [];

              if (teamUsers.length === 0) return null;

              return (
                <div key={team} style={{ marginBottom: "14px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                    {team}
                  </div>

                  {teamUsers.map((u) => (
                    <label
                      key={u.id}
                      style={{
                        display: "block",
                        paddingLeft: "12px",
                        marginBottom: "4px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={memberIds.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                        style={{ marginRight: "6px" }}
                      />
                      {u.name} ({u.level})
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <hr />

        <input
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <hr />

        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <hr />

        <div>
          <label>마감 기한</label>
          <br />
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>

        <br />

        <button type="submit">생성</button>
      </form>
    </div>
  );
}