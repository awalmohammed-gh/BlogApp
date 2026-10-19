import test from "node:test";
import assert from "node:assert/strict";
import { resolveSmtpConfig } from "../src/config/smtp.js";

test("existing Brevo SMTP aliases work with an explicit login and sender", () => {
  const config = resolveSmtpConfig({ SMTP_Server: "smtp-relay.brevo.com", SMTP_Key: "controlled-smtp-key", SMTP_USER: "controlled@smtp-brevo.com", SMTP_FROM: "Nsemra News <sender@example.test>" });
  assert.equal(config.configured, true);
  assert.equal(config.brevo, true);
  assert.equal(config.port, 587);
  assert.equal(config.password, "controlled-smtp-key");
});

test("Brevo key/server alone cannot be mistaken for a complete transport", () => {
  const config = resolveSmtpConfig({ SMTP_Server: "smtp-relay.brevo.com", SMTP_Key: "controlled-smtp-key" });
  assert.equal(config.configured, false);
  assert.deepEqual(config.missing, ["SMTP_FROM", "SMTP_USER"]);
  assert.ok(!JSON.stringify(config.missing).includes("controlled-smtp-key"));
});

test("canonical variables override aliases, including empty test isolation values", () => {
  const config = resolveSmtpConfig({ SMTP_HOST: "127.0.0.1", SMTP_Server: "smtp-relay.brevo.com", SMTP_PASSWORD: "", SMTP_Key: "real-key-must-not-be-used", SMTP_USER: "", SMTP_FROM: "sender@example.test" });
  assert.equal(config.configured, true);
  assert.equal(config.password, "");
  assert.equal(config.brevo, false);
});

test("invalid ports, partial authentication and header injection fail configuration", () => {
  assert.equal(resolveSmtpConfig({ SMTP_HOST: "relay.example.test", SMTP_FROM: "sender@example.test", SMTP_USER: "login" }).configured, false);
  assert.equal(resolveSmtpConfig({ SMTP_HOST: "relay.example.test", SMTP_FROM: "sender@example.test", SMTP_PORT: "invalid" }).configured, false);
  assert.equal(resolveSmtpConfig({ SMTP_HOST: "relay.example.test", SMTP_FROM: "sender@example.test\r\nBcc: other@example.test" }).configured, false);
});
