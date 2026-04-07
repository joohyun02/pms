import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [view, setView] = useState("mine");
  const [pendingUsers, setPendingUsers] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const loadDashboard = () => {
    const params = new URLSearchParams();

    if (search) params.append("q", search);
    if (teamFilter) params.append("team", teamFilter);
    if (showDeleted) params.append("showDeleted", "true");
    if (view) params.append("view", view);

    apiFetch(`/tasks/dashboard?${params.toString()}`)
      .then(setData)
      .catch((err) => alert(err.message));
  };

  const handleRefresh = () => {
    loadDashboard();
    console.log("대시보드 갱신");
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [showDeleted, view, teamFilter]);

  const canApproveSignup =
    user?.level === "대표" || user?.level === "이사";

  const loadPendingUsers = async () => {
    if (!canApproveSignup) return;

    try {
      const result = await apiFetch("/users/pending");
      setPendingUsers(result);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (canApproveSignup) {
      loadPendingUsers();
    }
  }, [canApproveSignup]);

  if (!data) return <div>Loading...</div>;

  const currentViewLabel = view === "mine" ? "내 업무" : "전체 업무";

  const filterTasks = (tasks) => {
    let filtered = tasks;

    if (statusFilter) {
      if (statusFilter === "지연") {
        filtered = filtered.filter(
          (t) => t.status !== "결재완료" && new Date(t.dueAt) < new Date()
        );
      } else if (statusFilter === "마감임박") {
        filtered = filtered.filter((t) => {
          const diff = new Date(t.dueAt) - new Date();
          return (
            t.status !== "결재완료" &&
            diff > 0 &&
            diff <= 24 * 60 * 60 * 1000
          );
        });
      } else if (statusFilter === "완료") {
        filtered = filtered.filter((t) => t.status === "결재완료");
      } else if (statusFilter === "진행중") {
        filtered = filtered.filter((t) => t.status !== "결재완료");
      } else {
        filtered = filtered.filter((t) => t.status === statusFilter);
      }
    }

    if (memberFilter.trim()) {
      const keyword = memberFilter.trim().toLowerCase();

      filtered = filtered.filter((task) => {
        const leaderName = (task.leader?.name || "").toLowerCase();
        const memberNames = (task.members || []).map((m) =>
          (m.user?.name || "").toLowerCase()
        );

        return (
          leaderName.includes(keyword) ||
          memberNames.some((name) => name.includes(keyword))
        );
      });
    }

    return filtered;
  };

  const renderList = (tasks) =>
    filterTasks(tasks).map((task) => {
      const dueDate = new Date(task.dueAt);
      const today = new Date();

      const oneDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.ceil((dueDate - today) / oneDay);

      let ddayText = "";
      if (task.status === "결재완료") {
        ddayText = "완료";
      } else if (diffDays > 0) {
        ddayText = `D-${diffDays}`;
      } else if (diffDays === 0) {
        ddayText = "D-Day";
      } else {
        ddayText = `D+${Math.abs(diffDays)}`;
      }

      const isLate =
        task.status === "결재완료" &&
        task.completedAt &&
        new Date(task.completedAt) > new Date(task.dueAt);

      const memberDisplay = (task.members || [])
        .map((m) => `${m.user?.name} [${m.user?.team}] (${m.role})`)
        .join(", ");

      return (
        <li
          key={task.displayId}
          style={{
            border: "1px solid #ddd",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
          }}
        >
          <Link to={`/tasks/${task.displayId}`}>
            <h3>{task.title}</h3>
          </Link>

          <div style={{ fontSize: "13px", color: "#555" }}>
            <div>
              <b>D-Day:</b>{" "}
              <span
                style={{
                  color:
                    diffDays < 0 && task.status !== "결재완료"
                      ? "red"
                      : "inherit",
                }}
              >
                {ddayText}
              </span>
            </div>
            <div>
              <b>작업코드:</b> {task.displayId}
            </div>
            <div>
              <b>리더:</b> {task.leader?.name || "-"}
            </div>
            <div>
              <b>팀 구성:</b> {memberDisplay || "-"}
            </div>
            <div>
              <b>생성일:</b> {new Date(task.createdAt).toLocaleString()}
            </div>
            <div>
              <b>마감일:</b> {new Date(task.dueAt).toLocaleString()}
            </div>
            <div>
              <b>상태:</b> {task.status}
              {isLate && " (지연 완료)"}
            </div>
          </div>
        </li>
      );
    });

  const { inProgress, overdue, completed, nearDue } = data.tasks;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px",
          borderBottom: "1px solid #ddd",
          marginBottom: "15px",
        }}
      >
        <div>
          <div>
            <b>현재 사용자:</b> {user?.name} ({user?.team}) ({user?.level})
          </div>
          <div style={{ marginTop: "6px", color: "#555" }}>
            <b>현재 페이지:</b> {currentViewLabel}
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "6px 10px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
      </div>

      <div style={{ marginTop: "12px" }}>
        <div>
          <button
            onClick={handleRefresh}
            style={{
              padding: "6px 10px",
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "8px",
            }}
          >
            🔄 갱신
          </button>
        </div>

        <h2>알림</h2>

        {data.notifications?.length === 0 ? (
          <p>새 알림이 없습니다.</p>
        ) : (
          <ul style={{ paddingLeft: "18px" }}>
            {data.notifications.map((n) => (
              <li key={n.id} style={{ marginBottom: "8px" }}>
                <div>{n.text}</div>

                {n.type === "signup" && canApproveSignup && (
                  <div style={{ marginTop: "4px" }}>
                    <button
                      onClick={async () => {
                        try {
                          await apiFetch(`/users/${n.userId}/approve`, {
                            method: "POST",
                          });
                          alert("승인 완료");
                          loadDashboard();
                          loadPendingUsers();
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                    >
                      승인
                    </button>

                    <button
                      style={{ marginLeft: "6px" }}
                      onClick={async () => {
                        try {
                          await apiFetch(`/users/${n.userId}/reject`, {
                            method: "POST",
                          });
                          alert("거절 완료");
                          loadDashboard();
                          loadPendingUsers();
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                    >
                      거절
                    </button>
                  </div>
                )}

                <div style={{ fontSize: "12px", color: "#666" }}>
                  {n.taskDisplayId} - {n.taskTitle}
                </div>

                <div style={{ fontSize: "12px", color: "#999" }}>
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canApproveSignup && pendingUsers.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <h3>가입 승인 대기</h3>
            <ul style={{ paddingLeft: "18px" }}>
              {pendingUsers.map((pendingUser) => (
                <li key={pendingUser.id} style={{ marginBottom: "8px" }}>
                  {pendingUser.name} ({pendingUser.team}) ({pendingUser.level})

                  <button
                    style={{ marginLeft: "8px" }}
                    onClick={async () => {
                      try {
                        await apiFetch(`/users/${pendingUser.id}/approve`, {
                          method: "POST",
                        });
                        alert("승인 완료");
                        loadDashboard();
                        loadPendingUsers();
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                  >
                    승인
                  </button>

                  <button
                    style={{ marginLeft: "6px" }}
                    onClick={async () => {
                      try {
                        await apiFetch(`/users/${pendingUser.id}/reject`, {
                          method: "POST",
                        });
                        alert("거절 완료");
                        loadDashboard();
                        loadPendingUsers();
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                  >
                    거절
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          onClick={() => setView("all")}
          style={{
            padding: "6px 12px",
            background: view === "all" ? "#1976d2" : "#f0f0f0",
            color: view === "all" ? "white" : "black",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          전체 업무 보기
        </button>

        <button
          onClick={() => setView("mine")}
          style={{
            padding: "6px 12px",
            background: view === "mine" ? "#1976d2" : "#f0f0f0",
            color: view === "mine" ? "white" : "black",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          내 업무 보기
        </button>
      </div>

      <h1>{currentViewLabel} 대시보드</h1>

      <h2>검색 / 필터</h2>
      <hr />

      <Link to="/create">
        <button
          style={{
            marginBottom: "20px",
            padding: "8px 14px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          + 프로젝트 생성
        </button>
      </Link>

      <input
        placeholder="제목/ID 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <input
        placeholder="리더/팀원 이름"
        value={memberFilter}
        onChange={(e) => setMemberFilter(e.target.value)}
      />

      <select
        value={teamFilter}
        onChange={(e) => setTeamFilter(e.target.value)}
      >
        <option value="">전체 팀</option>
        <option value="대표">대표</option>
        <option value="관리팀">관리팀</option>
        <option value="개발팀">개발팀</option>
        <option value="기획팀">기획팀</option>
        <option value="디자인팀">디자인팀</option>
      </select>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">전체 상태</option>
        <option value="진행중">진행중</option>
        <option value="완료">완료</option>
        <option value="지연">지연</option>
        <option value="마감임박">마감임박</option>
        <option value="지시등록">지시등록</option>
        <option value="읽음">읽음</option>
        <option value="보완요청">보완요청</option>
        <option value="완료보고">완료보고</option>
        <option value="결재완료">결재완료</option>
      </select>

      <button onClick={loadDashboard}>검색</button>

      <button onClick={() => setShowDeleted(!showDeleted)}>
        {showDeleted ? "정상 목록 보기" : "삭제된 항목 보기"}
      </button>

      <hr />

      <h2>요약</h2>
      <ul>
        <li>전체: {data.summary.total}</li>
        <li>진행중: {data.summary.inProgress}</li>
        <li>
          <span style={{ color: "red" }}>지연:</span> {data.summary.overdue}
        </li>
        <li>완료: {data.summary.completed}</li>
        <li>마감임박: {data.summary.nearDue}</li>
      </ul>

      <hr />

      {!showDeleted ? (
        <>
          <h2>진행중</h2>
          <ul>{renderList(inProgress)}</ul>

          <h2 style={{ color: "red" }}>지연</h2>
          <ul>{renderList(overdue)}</ul>

          <h2>마감임박</h2>
          <ul>{renderList(nearDue)}</ul>

          <h2>완료</h2>
          <ul>{renderList(completed)}</ul>
        </>
      ) : (
        <>
          <h2>삭제된 항목</h2>
          <ul>
            {[...inProgress, ...overdue, ...completed, ...nearDue].map(
              (task) => (
                <li key={task.displayId}>
                  {task.displayId} - {task.title}
                  <button
                    onClick={async () => {
                      await apiFetch(`/tasks/${task.displayId}/restore`, {
                        method: "PATCH",
                      });
                      loadDashboard();
                    }}
                  >
                    복구
                  </button>
                </li>
              )
            )}
          </ul>
        </>
      )}
    </div>
  );
}