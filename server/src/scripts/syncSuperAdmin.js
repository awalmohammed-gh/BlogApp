import connectDatabase, { disconnectDatabase } from "../config/database.js";
import Admin from "../models/Admin.js";
import env from "../config/env.js";
import { initialAdminBootstrapSchema } from "../validations/adminAuthValidation.js";

/**
 * Explicitly synchronizes the initial Super Admin account with ADMIN_EMAIL /
 * ADMIN_PASSWORD from server/.env. It never runs on server startup.
 *
 *   npm run admin:sync -- --dry-run   preview only, writes nothing
 *   npm run admin:sync                apply
 *
 * Target selection (never touches Editor/Author accounts):
 *   1. the account whose email equals ADMIN_EMAIL, if it is a super_admin
 *   2. otherwise, when exactly one super_admin exists, that account
 *   3. otherwise, when no super_admin exists, a new one is created
 * Anything ambiguous (several super admins, or ADMIN_EMAIL belonging to a
 * staff account) stops without changes.
 */
const dryRun = process.argv.includes("--dry-run");

async function syncSuperAdmin() {
  console.log(`=== Nsemra News: Super Admin credential synchronization${dryRun ? " (dry run)" : ""} ===`);

  const validation = initialAdminBootstrapSchema.safeParse({
    name: "Super Administrator",
    email: (env.ADMIN_EMAIL || "").trim().toLowerCase(),
    password: env.ADMIN_PASSWORD || ""
  });
  if (!validation.success) {
    console.error("[Error] ADMIN_EMAIL / ADMIN_PASSWORD are missing or invalid:");
    for (const issue of validation.error.issues) console.error(` - ${issue.path.join(".")}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }
  // The password is used exactly as configured so it matches what is typed at login.
  const { email, password } = validation.data;

  await connectDatabase();
  try {
    let target = await Admin.findOne({ email }).select("+passwordHash");
    if (target && target.role !== "super_admin") {
      console.error(`[Stopped] ${email} belongs to an existing ${target.role} account. Staff accounts are never converted automatically.`);
      process.exitCode = 1;
      return;
    }
    if (!target) {
      const superAdmins = await Admin.find({ role: "super_admin" }).select("+passwordHash");
      if (superAdmins.length > 1) {
        console.error(`[Stopped] ${superAdmins.length} Super Admin accounts exist and none uses ADMIN_EMAIL. Choose one manually.`);
        process.exitCode = 1;
        return;
      }
      target = superAdmins[0] || null;
    }

    if (!target) {
      console.log(`[Plan] Create Super Admin ${email}.`);
      if (dryRun) return;
      const created = await Admin.create({ name: "Super Administrator", email, passwordHash: await Admin.hashPassword(password), role: "super_admin", status: "active" });
      console.log(`[Done] Created Super Admin ${created._id}.`);
      return;
    }

    const emailChanges = target.email !== email;
    const passwordMatches = target.passwordHash ? await target.comparePassword(password) : false;
    const activates = target.status !== "active";
    console.log(`[Plan] Super Admin ${target._id}: email ${emailChanges ? "will change" : "already matches"}, password ${passwordMatches ? "already matches" : "will be re-hashed"}, status ${activates ? "will be set active" : "already active"}.`);
    if (!emailChanges && passwordMatches && !activates) {
      console.log("[Done] Nothing to change.");
      return;
    }
    if (dryRun) return;

    target.email = email;
    target.status = "active";
    if (!passwordMatches) {
      target.passwordHash = await Admin.hashPassword(password);
      target.passwordChangedAt = new Date();
      // Sign out sessions created with the previous password
      target.tokenVersion = (target.tokenVersion || 0) + 1;
    }
    await target.save();
    console.log("[Done] Super Admin synchronized. Plain-text passwords are never stored.");
  } finally {
    await disconnectDatabase();
  }
}

syncSuperAdmin().catch((error) => {
  console.error("[Sync failed]", error.message);
  process.exitCode = 1;
});
