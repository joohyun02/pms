import { useState } from "react";
import { apiFetch } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
  try {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem("token", result.token);
    localStorage.setItem("user", JSON.stringify(result.user));
    navigate("/dashboard");
  } catch (err) {
    console.error("로그인 실패:", err.message);
    alert(err.message);
  }
};

  return (
    <div>
      <h1>로그인</h1>

      <input
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />

      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div style={{marginTop: "10px"}}>
        <button onClick={handleLogin}>로그인</button>
        <button
            type="button"
            onClick={() => navigate("/register")}
            style={{width: "8.5%"}}>
              회원가입 
          </button>
        </div>

    </div>
  );
}
