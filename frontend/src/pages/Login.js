import React, { useState } from "react";
import '../App.css'; // This should contain your custom styles

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Login Successful! Welcome " + data.user.name);
      // Data ko localStorage mein save karein takay user logged-in rahay
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard"; // Ya jahan aap bhejna chahein
    } else {
      alert(data.error || "Invalid Credentials");
    }
  } catch (err) {
    alert("Backend server is not responding");
  }
};
  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />
        <button onClick={handleLogin} className="login-button">
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;
