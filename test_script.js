import fs from 'fs';
import fetch from 'node-fetch';

async function test() {
  try {
    const loginRes = await fetch("http://localhost:5000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }) // assume some test user, or we can register one
    });
    console.log("Login status:", loginRes.status);
  } catch(e) {
    console.log(e);
  }
}
test();
