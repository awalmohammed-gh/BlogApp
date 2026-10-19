// Canonical names take precedence, including deliberate empty overrides in tests.
// Existing Brevo entries are supported without copying or exposing the key.
export const resolveSmtpConfig = (source = process.env) => {
  const read = (name, alias) => String(source[name] ?? (alias ? source[alias] : undefined) ?? "").trim();
  const host = read("SMTP_HOST", "SMTP_Server");
  const user = read("SMTP_USER");
  const password = read("SMTP_PASSWORD", "SMTP_Key");
  const configuredFrom = read("SMTP_FROM");
  // A bare sender address gets the public brand as its display name; the address itself is never changed.
  const from = /^[^\s<>@"]+@[^\s<>@"]+$/.test(configuredFrom) ? `"Nsemra News" <${configuredFrom}>` : configuredFrom;
  const port = Number(read("SMTP_PORT") || 587);
  const brevo = host.toLowerCase() === "smtp-relay.brevo.com";
  const missing = [];
  if (!host) missing.push("SMTP_HOST (or SMTP_Server)");
  if (!from) missing.push("SMTP_FROM");
  if ((brevo || password) && !user) missing.push("SMTP_USER");
  if ((brevo || user) && !password) missing.push("SMTP_PASSWORD (or SMTP_Key)");
  if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push("valid SMTP_PORT");
  if (/[\r\n]/.test(from)) missing.push("valid SMTP_FROM");
  return { host, port, user, password, from, brevo, missing, configured: missing.length === 0 };
};

// Safe diagnostics expose configuration field names, never their secret values.
export const smtpConfigurationStatus = () => {
  const { configured, missing, brevo } = resolveSmtpConfig();
  return { configured, missing, provider: brevo ? "Brevo SMTP" : "SMTP" };
};
