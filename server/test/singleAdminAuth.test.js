process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import connectDatabase from "../src/config/database.js";
import Admin from "../src/models/Admin.js";

test("Single-Admin Authentication System with 6-Digit OTP Flow", async (t) => {
  await connectDatabase();

  // Clean slate before tests
  await Admin.deleteMany({});

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await Admin.deleteMany({});
    await new Promise((resolve) => server.close(resolve));
  });

  await t.test("1. Initial status reports initialized: false", async () => {
    const res = await fetch(`${baseUrl}/api/auth/status`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.initialized, false);
    assert.strictEqual(data.unverifiedEmail, null);
  });

  let receivedOtp = null;

  await t.test("2. Step 1: POST /api/auth/setup creates unverified admin and generates 6-digit OTP", async () => {
    const res = await fetch(`${baseUrl}/api/auth/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Supreme Administrator",
        email: "admin.chief@nsemfoa.com",
        password: "SuperSecretAdminPassword123!"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.email, "admin.chief@nsemfoa.com");
    assert(data.testOtp, "Should include testOtp in test mode");
    assert(/^\d{6}$/.test(data.testOtp), "OTP must be exactly 6 digits");
    receivedOtp = data.testOtp;

    // Check DB record
    const admin = await Admin.findOne({ email: "admin.chief@nsemfoa.com" }).select("+passwordHash +otpCodeHash");
    assert(admin, "Admin record should exist in DB");
    assert.strictEqual(admin.isVerified, false, "Admin must be unverified initially");
    assert(admin.otpCodeHash, "Admin must have hashed OTP code");
    assert(admin.otpExpiresAt > new Date(), "OTP expiry must be in the future");
  });

  await t.test("3. Status now reports initialized: false with pending unverified email", async () => {
    const res = await fetch(`${baseUrl}/api/auth/status`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.initialized, false);
    assert.strictEqual(data.unverifiedEmail, "admin.chief@nsemfoa.com");
  });

  await t.test("4. Login before verification is rejected", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.chief@nsemfoa.com",
        password: "SuperSecretAdminPassword123!"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.match(data.message, /not been set up/i);
  });

  await t.test("5. POST /api/auth/resend-otp sends fresh 6-digit OTP", async () => {
    const res = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.chief@nsemfoa.com"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert(data.testOtp, "Should include new testOtp");
    assert(/^\d{6}$/.test(data.testOtp), "New OTP must be 6 digits");
    receivedOtp = data.testOtp; // update with refreshed OTP
  });

  await t.test("6. POST /api/auth/verify-otp with wrong OTP is rejected", async () => {
    const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.chief@nsemfoa.com",
        otp: "000000"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.match(data.message, /invalid/i);
  });

  await t.test("7. POST /api/auth/verify-otp with valid 6-digit OTP locks registration and logs in", async () => {
    const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.chief@nsemfoa.com",
        otp: receivedOtp
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert(data.admin, "Should return sanitized admin");
    assert.strictEqual(data.admin.isVerified, true);

    // Verify cookie set
    const setCookie = res.headers.get("set-cookie");
    assert(setCookie && setCookie.includes("admin_token"), "Should set admin_token cookie");

    // Check DB
    const admin = await Admin.findOne({ email: "admin.chief@nsemfoa.com" }).select("+otpCodeHash");
    assert.strictEqual(admin.isVerified, true);
    assert.strictEqual(admin.otpCodeHash, null, "otpCodeHash should be cleared");
    assert.strictEqual(admin.otpExpiresAt, null, "otpExpiresAt should be cleared");
  });

  await t.test("8. Status now permanently reports initialized: true", async () => {
    const res = await fetch(`${baseUrl}/api/auth/status`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.initialized, true);
  });

  await t.test("9. Setup is now permanently locked (returns 403 Forbidden)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Attacker Imposter",
        email: "attacker@nsemfoa.com",
        password: "MaliciousPassword123!"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.match(data.message, /permanently locked/i);
  });

  await t.test("10. Resend OTP is also permanently locked once initialized (returns 403 Forbidden)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.chief@nsemfoa.com"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.match(data.message, /permanently locked/i);
  });

  await t.test("11. Verified Admin can log in successfully with credentials", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.chief@nsemfoa.com",
        password: "SuperSecretAdminPassword123!"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.admin.email, "admin.chief@nsemfoa.com");
    assert.strictEqual(data.admin.isVerified, true);
  });

  await t.test("12. Login fails with wrong password", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.chief@nsemfoa.com",
        password: "WrongPassword999!"
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.match(data.message, /invalid/i);
  });
});
