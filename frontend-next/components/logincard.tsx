"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./logincard.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

      // Store token and user data in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        _id: data._id,
        username: data.username,
        email: data.email,
      }));

      router.push("/user_profile");
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

      // Store token and user data in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        _id: data._id,
        username: data.username,
        email: data.email,
      }));

      router.push("/user_profile");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      <form onSubmit={handleSubmit} className={styles.loginContainer}>
        <h1 className={styles.loginText}>{isSignup ? "Sign Up" : "Login"}</h1>
        
        {error && (
          <div className="text-red-600 text-center text-lg">{error}</div>
        )}

        {isSignup && (
          <>
            <label className={styles.boxLabels} htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className={styles.inputBox}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </>
        )}

        <label className={styles.boxLabels} htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          className={styles.inputBox}
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className={styles.boxLabels} htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          className={styles.inputBox}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button 
          type="submit" 
          className={styles.loginButton}
          disabled={loading}
        >
          <span className={styles.loginButtonLabel}>
            {loading ? "..." : (isSignup ? "Sign Up" : "Login")}
          </span>
        </button>

        <div onClick={toggleMode} className={styles.signupLink}>
          {isSignup ? "Already have an account? Login" : "Sign Up"}
        </div>
      </form>
    </div>
  );
};

export default LoginCard;