"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const USER_STATE_EVENT = "artport-user-updated";
type FormOnSubmit = NonNullable<ComponentProps<"form">["onSubmit"]>;

const LoginCard: React.FC = () => {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        _id: data._id,
        username: data.username,
        email: data.email,
      }));
      window.dispatchEvent(new Event(USER_STATE_EVENT));

      router.push("/me");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        _id: data._id,
        username: data.username,
        email: data.email,
      }));
      window.dispatchEvent(new Event(USER_STATE_EVENT));

      router.push("/me");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit: FormOnSubmit = (e) => {
    e.preventDefault();
    if (isSignup) {
      handleSignup();
    } else {
      handleLogin();
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError("");
  };

  return (
    <div className="w-full flex justify-center">
      <form onSubmit={handleSubmit} className="login-container">
        <h1 className="login-text">{isSignup ? "Sign Up" : "Login"}</h1>
        
        {error && (
          <div className="text-red-600 text-center text-lg">{error}</div>
        )}

        {isSignup && (
          <>
            <label className="box-labels" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="input-box"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </>
        )}

        <label className="box-labels" htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          className="input-box"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="box-labels" htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          className="input-box"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button 
          type="submit" 
          className="login-button"
          disabled={loading}
        >
          <span className="login-button-label">
            {loading ? "..." : (isSignup ? "Sign Up" : "Login")}
          </span>
        </button>

        <div onClick={toggleMode} className="signup-link">
          {isSignup ? "Already have an account? Login" : "Sign Up"}
        </div>
      </form>
    </div>
  );
};

export default LoginCard;