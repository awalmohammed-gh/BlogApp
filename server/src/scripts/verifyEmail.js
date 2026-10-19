import { smtpConfigurationStatus } from "../config/smtp.js";
import { createEmailTransport } from "../services/emailService.js";

const status = smtpConfigurationStatus();
if (!status.configured) {
  console.error(`[Email] ${status.provider} is incomplete. Required: ${status.missing.join(", ")}.`);
  process.exitCode = 1;
} else {
  const transport = createEmailTransport();
  try {
    await transport.verify();
    console.log(`[Email] ${status.provider} connection and authentication verified. No message was sent. Sender acceptance and inbox delivery are not verified by this check.`);
  } catch {
    console.error(`[Email] ${status.provider} verification failed. Check SMTP credentials, provider access and network connectivity. No message was sent.`);
    process.exitCode = 1;
  } finally { transport.close(); }
}
