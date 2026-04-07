import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiFetch } from "../api/client";


export default function TaskDetail() {
  const { displayId } = useParams();
  
  const attachmentSectionRef = useRef(null); 

  const [task, setTask] = useState(null);

  const [statusComment, setStatusComment] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [commentContent, setCommentContent] = useState("");

  const [requests, setRequests] = useState([]);

  const [memberOpen, setMemberOpen] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [memberSelected, setMemberSelected] = useState(new Set());
  const [memberInitial, setMemberInitial] = useState(new Set());
  const [userKeyword, setUserKeyword] = useState("");

  const [ownerChangeOpen, setOwnerChangeOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");

  const [selectedFile, setSelectedFile ] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  

  const user = JSON.parse(localStorage.getItem("user"));

  const loadTask = async () => {
    const data = await apiFetch(`/tasks/${displayId}`);
    setTask(data);
  };

  const loadRequests = async () => {
    try {
      const data = await apiFetch(`/tasks/${displayId}/permission-requests`);
      setRequests(data);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    loadTask();
    loadRequests();
  }, [displayId]);

  const leaderId = task?.leader?.id;

  const filteredUsers = useMemo(() => {
    if (!task) return [];

    const kw = userKeyword.trim().toLowerCase();
    const candidates = allUsers.filter((u) => u.id !== leaderId);

    if (!kw) return candidates;

    return candidates.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(kw) || email.includes(kw);
    });
  }, [allUsers, userKeyword, leaderId, task]);

  const activityFeed = useMemo(() => {
    if (!task) return [];

    const statusItems = (task.statusHistory || []).map((item) => ({
      id: `status-${item.id}`,
      type: "status",
      createdAt: item.createdAt || item.changedAt || item.updatedAt,
      actorName: item.changer?.name || "알 수 없음",
      actorTeam: item.changer?.team || "",
      title: `${item.fromStatus} → ${item.toStatus}`,
      description: item.comment || "",
    }));

    const commentItems = (task.comments || []).map((item) => ({
      id: `comment-${item.id}`,
      type: "comment",
      createdAt: item.createdAt || item.updatedAt,
      actorName: item.writer?.name || "알 수 없음",
      actorTeam: item.writer?.team || "",
      title: "협업 의견 등록",
      description: item.content || "",
    }));

    const attachmentItems = (task.attachments || []).map((item) => ({
      id: `attachment-${item.id}`,
      type: "attachment",
      createdAt: item.createdAt || item.updatedAt,
      actorName: item.uploader?.name || "알 수 없음",
      actorTeam: item.uploader?.team || "",
      title: "파일 업로드",
      description: item.originalName || "",
      attachmentId: item.id,
      attachmentName: item.originalName,
      attachmentSize: item.size,
    }));

    return [...statusItems, ...commentItems, ...attachmentItems].sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [task]);

  if (!task) return <div>Loading...</div>;

  const isAdmin = user?.level === "ADMIN";

  const myMember = task.members?.find((m) => String(m.user.id) === String(user?.id));
  const isOwner = myMember?.role === "OWNER";
  const isMember = myMember?.role === "MEMBER";

  const canManageMembers = isAdmin || isOwner;
  const canComment = isAdmin || !!myMember;
  const canChangeStatus = isAdmin || isOwner || isMember;
  const isCompleted = task.status === "결재완료";

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

  let allowedStatuses = [];
  if (isAdmin || isOwner) {
    allowedStatuses = ["진행중", "완료보고", "보완요청", "결재완료"];
  } else if (isMember) {
    allowedStatuses = ["진행중", "완료보고"];
  }

  const handleStatusChange = async (e) => {
    e.preventDefault();

    if (!statusValue) return alert("상태 선택");
    if (!statusComment.trim()) return alert("설명 입력");

    try {
      await apiFetch(`/tasks/${displayId}/status`, {
        method: "POST",
        body: JSON.stringify({
          toStatus: statusValue,
          content: statusComment,
        }),
      });

      setStatusValue("");
      setStatusComment("");
      loadTask();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes == null || Number.isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  };

  const getFileIcon = (name = "") => {
    const ext = name.split(".").pop()?.toLowerCase();

    if (["pdf"].includes(ext)) return "📕";
    if (["ppt", "pptx"].includes(ext)) return "📙";
    if (["doc", "docx"].includes(ext)) return "📘";
    if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    if (["txt", "md"].includes(ext)) return "📝";
    return "📎";
  };

  const formatDateTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleString();
  };


  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!commentContent.trim()) return alert("내용 입력");

    try {
      await apiFetch(`/tasks/${displayId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentContent }),
      });

      setCommentContent("");
      loadTask();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleCommentUpdate = async (e) => {
    e.preventDefault();

    if (!editingCommentContent.trim()) {
      return alert("내용 입력");
    }

    try {
      await apiFetch(`/tasks/comments/${editingCommentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content: editingCommentContent,
        }),
      });

      alert("댓글 수정 완료");
      setEditingCommentId(null);
      setEditingCommentContent("");
      loadTask();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCommentDelete = async (commnetId) => {
    const ok = window.confirm("이 댓글을 삭제하시겠습니까?");
    if (!ok) return;

    try{
      await apiFetch(`/tasks/comments/${commnetId}`, {
        method: "DELETE",
      });

      alert("댓글 삭제 완료");

      if (editingCommentId === commnetId) {
        setEditingCommentId(null);
        setCommentContent("");
      }

      loadTask();
    } catch (err) {
      alert(err.message);
    }
  };

  const openMemberModal = async () => {
    if (!canManageMembers) return;

    setMemberOpen(true);
    setMemberLoading(true);
    setUserKeyword("");

    try {
      const users = await apiFetch("/users");
      setAllUsers(users);

      const data = await apiFetch(`/tasks/${displayId}/members`);
      const members = data.members || [];

      const memberIds = members
        .filter((m) => m.role === "MEMBER")
        .map((m) => m.userId);

      const selected = new Set(memberIds);
      setMemberSelected(new Set(selected));
      setMemberInitial(new Set(selected));
    } catch (err) {
      alert(err.message);
      setMemberOpen(false);
    } finally {
      setMemberLoading(false);
    }
  };

  const toggleMember = (userId) => {
    setMemberSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const saveMembers = async () => {
    setMemberLoading(true);

    try {
      await apiFetch(`/tasks/${displayId}/members`, {
        method: "POST",
        body: JSON.stringify({
          userIds: Array.from(memberSelected),
        }),
      });

      alert("팀원 저장 완료");
      setMemberOpen(false);
      loadTask();
    } catch (err) {
      alert(err.message);
    } finally {
      setMemberLoading(false);
    }
  };

  // 파일 업로드 함수
  const handleFileUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      return alert("파일을 선택하세요.");
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:3000/attachments/${displayId}`,{
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.message || "업로드 실패");
      }

      alert("파일 업로드 완료");
      setSelectedFile(null);
      await loadTask();

      setTimeout(() => {
        attachmentSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };
  // 파일 다운 함수.
  const handleDownload = async (attachmentId, originalName) => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:3000/attachments/download/${attachmentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      throw new Error(result.message || "다운로드 실패");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
};

  //파일 삭제 함수
  const handleDeleteAttachment = async (attachmentId) => {
  const ok = window.confirm("이 파일을 삭제하시겠습니까?");
  if (!ok) return;

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:3000/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(result.message || "파일 삭제 실패");
    }

    alert("파일 삭제 완료");
    loadTask();
  } catch (err) {
    alert(err.message);
  }
};
  return (
    <div>
      <h1>{task.title}</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        {(isAdmin || isOwner) && (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("정말 삭제하시겠습니까?")) return;

              try {
                await apiFetch(`/tasks/${displayId}/delete`, {
                  method: "PATCH",
                });
                window.location.href = "/dashboard";
              } catch (err) {
                alert(err.message);
              }
            }}
          >
            삭제
          </button>
        )}

        {canManageMembers && (
          <button type="button" onClick={openMemberModal}>
            팀원 관리
          </button>
        )}

        {(isAdmin || isOwner) && (
          <button type="button" onClick={() => setOwnerChangeOpen(true)}>
            OWNER 변경
          </button>
        )}
      </div>

      {isOwner && requests.length > 0 && (
        <div
          style={{
            border: "1px solid orange",
            padding: "10px",
            marginBottom: "10px",
            background: "#fff8e1",
          }}
        >
          <b>팀 참여 요청</b>

          {requests.map((r) => (
            <div key={r.id} style={{ marginTop: "6px" }}>
              {r.requester.name} 님이 팀 참여를 요청했습니다.

              <button
                style={{ marginLeft: "10px" }}
                onClick={async () => {
                  try {
                    await apiFetch(`/tasks/permission-request/${r.id}/approve`, {
                      method: "POST",
                    });
                    await loadRequests();
                    await loadTask();
                  } catch (err) {
                    alert(err.message);
                  }
                }}
              >
                승인
              </button>

              <button
                style={{ marginLeft: "5px" }}
                onClick={async () => {
                  try {
                    await apiFetch(`/tasks/permission-request/${r.id}/reject`, {
                      method: "POST",
                    });
                    await loadRequests();
                  } catch (err) {
                    alert(err.message);
                  }
                }}
              >
                거절
              </button>
            </div>
          ))}
        </div>
      )}

      <p><b>리더:</b> {task.leader?.name}</p>

      <h3>팀 구성</h3>
      <ul>
        {task.members?.map((m) => (
          <li key={m.id}>
            {m.user.name} [{m.user.team}] ({m.role})
          </li>
        ))}
      </ul>

      <p><b>현재 상태:</b> {task.status}</p>
      <p><b>마감:</b> {new Date(task.dueAt).toLocaleString()}</p>
      <p>
        <b>D-Day:</b>{" "}
        <span style={{ color: diffDays < 0 && task.status !== "결재완료" ? "red" : "inherit" }}>
          {ddayText}
        </span>
      </p>

      <hr />

      <h2>상태 이력</h2>
      <ul>
        {task.statusHistory?.map((h) => (
          <li key={h.id}>
            <b>{h.changer?.name}</b> : {h.fromStatus} → {h.toStatus}
            {h.comment && (
              <>
                <br />
                <span style={{ marginLeft: "10px" }}>
                  설명: {h.comment}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      {!isCompleted && canChangeStatus && (
        <form onSubmit={handleStatusChange}>
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
          >
            <option value="">상태 선택</option>
            {allowedStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <textarea
            placeholder="상태 변경 설명 입력"
            value={statusComment}
            onChange={(e) => setStatusComment(e.target.value)}
            rows={3}
          />

          <button type="submit">상태 변경</button>
        </form>
      )}

      <hr />

           <h2>협업 의견</h2>
     <ul>
      {task.comments?.map((c) => {
        const canEditComment =
          isAdmin || String(c.writer?.id) === String(user?.id);

        const isEditing = editingCommentId === c.id;

        return (
          <li key={c.id} style={{ marginBottom: "8px" }}>
            <b>{c.writer?.name}</b> :{" "}

            {isEditing ? (
              <form onSubmit={handleCommentUpdate} style={{ display: "inline" }}>
                <input
                  type="text"
                  value={editingCommentContent}
                  onChange={(e) => setEditingCommentContent(e.target.value)}
                  style={{ marginRight: "6px" }}
                />
                <button type="submit">저장</button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingCommentContent("");
                  }}
                  style={{ marginLeft: "4px" }}
                >
                  취소
                </button>
              </form>
            ) : (
              <>
                {c.content}
                {" "}
                {c.updatedAt && new Date(c.updatedAt).getTime() > new Date(c.createdAt).getTime() && (
                  <span style={{ color: "#999", fontSize: "12px", marginLeft: "4px" }}>
                    (수정됨)
                  </span>
                )}
                {" "}
                <span style={{ fontSize: "12px", color: "#999" }}>
                  {new Date(c.createdAt).toLocaleString()}
                </span>

                {canEditComment && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditComment(c)}
                      style={{ marginLeft: "8px" }}
                    >
                      수정
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCommentDelete(c.id)}
                      style={{ marginLeft: "4px" }}
                    >
                      삭제
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>

      {!isCompleted && canComment && (
        <form onSubmit={handleCommentSubmit}>
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            rows={3}
          />
          <button type="submit">의견 등록</button>
        </form>
      )}

      <hr />

      <h2 ref={attachmentSectionRef}>첨부파일</h2>
      <ul>
        {task.attachments?.map((file) => {
          const canDeleteFile =
            isAdmin ||
            isOwner ||
            String(file.uploader?.id) === String(user?.id);

          return (
            <li key={file.id} style={{ marginBottom: "6px"}}>
              <button
                type="button"
                onClick={() => handleDownload(file.id, file.originalName)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "blue",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {getFileIcon(file.originalName)} {file.originalName} ({formatFileSize(file.size)})
              </button>
              {" "}

              <div style={{ fontSize: "12px", color: "#666" }}>
                {file.uploader?.name} [{file.uploader?.team}]
              </div>

              {canDeleteFile && (
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(file.id)}
                  style={{ marginLeft: "8px" }}
                >
                  삭제
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {canComment && (
        <form onSubmit={handleFileUpload}>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          <button type="submit" disabled={uploading}>
            {uploading ? "업로드 중..." : "파일 업로드"}
          </button>
        </form>
      )}

      {!canComment && (
        <button
          type="button"
          onClick={async () => {
            try {
              await apiFetch(`/tasks/${displayId}/permission-request`, {
                method: "POST",
              });
              alert("팀 참여 요청 완료");
              await loadRequests();
            } catch (err) {
              alert(err.message);
            }
          }}
        >
          팀 참여 요청
        </button>
      )}





      {memberOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => !memberLoading && setMemberOpen(false)}
        >
          <div
            style={{
              width: "520px",
              maxHeight: "80vh",
              overflow: "auto",
              background: "white",
              borderRadius: "10px",
              padding: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>팀원 관리 (MEMBER)</h3>

            <div style={{ marginBottom: "8px", color: "#555" }}>
              리더(OWNER)는 자동 포함되며, 여기서는 MEMBER만 관리합니다.
            </div>

            <input
              type="text"
              placeholder="이름 또는 이메일 검색"
              value={userKeyword}
              onChange={(e) => setUserKeyword(e.target.value)}
              style={{
                width: "100%",
                padding: "6px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />

            {memberLoading ? (
              <div>로딩 중...</div>
            ) : (
              <>
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                >
                  {filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        padding: "6px 4px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={memberSelected.has(u.id)}
                        onChange={() => toggleMember(u.id)}
                      />
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      <span style={{ color: "#666" }}>{u.level}</span>
                      <span style={{ color: "#999" }}>{u.email}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setMemberOpen(false)}
                  >
                    닫기
                  </button>

                  <button
                    type="button"
                    onClick={saveMembers}
                  >
                    저장
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {ownerChangeOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setOwnerChangeOpen(false)}
        >
          <div
            style={{
              width: "420px",
              background: "white",
              borderRadius: "10px",
              padding: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>OWNER 변경</h3>

            <select
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              style={{ width: "100%", marginBottom: "12px" }}
            >
              <option value="">새 OWNER 선택</option>
              {task.members
                ?.filter((m) => m.user.id !== task.leader?.id)
                .map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name} [{m.user.team}]
                  </option>
                ))}
            </select>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setOwnerChangeOpen(false)}
              >
                닫기
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!newOwnerId) return alert("새 OWNER를 선택하세요.");

                  try {
                    await apiFetch(`/tasks/${displayId}/change-owner`, {
                      method: "POST",
                      body: JSON.stringify({ newOwnerId }),
                    });

                    alert("OWNER 변경 완료");
                    setOwnerChangeOpen(false);
                    setNewOwnerId("");
                    loadTask();
                  } catch (err) {
                    alert(err.message);
                  }
                }}
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}