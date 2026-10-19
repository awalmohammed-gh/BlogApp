import readline from "readline";
import connectDatabase, { disconnectDatabase } from "../config/database.js";
import Admin from "../models/Admin.js";
import env from "../config/env.js";
import { initialAdminBootstrapSchema } from "../validations/adminAuthValidation.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function bootstrapSuperAdmin() {
  console.log("   Nsemra News CMS: Super Admin Bootstrap Setup Script  ");

  try {
    await connectDatabase();

    // Check if a super_admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: "super_admin" });

    if (existingSuperAdmin) {
      console.log(`[Bootstrap Notice] A Super Admin account already exists: (${existingSuperAdmin.email}).`);
      console.log("[Bootstrap Notice] Duplicate super administrators cannot be initialized through this script.");
      console.log("[Bootstrap Notice] Exiting safely.\n");
      process.exit(0);
    }

    // Check if credentials are provided via environment variables
    let name = process.env.BOOTSTRAP_ADMIN_NAME;
    // Same variables the login uses (ADMIN_EMAIL / ADMIN_PASSWORD, BOOTSTRAP_* accepted as fallback)
    let email = env.ADMIN_EMAIL;
    let password = env.ADMIN_PASSWORD;

    // If not provided in environment, prompt interactively
    if (!name || !email || !password) {
      console.log("Please provide credentials for the initial Super Admin account:\n");
      name = name || (await askQuestion("Enter Full Name (e.g. Mohammed Awal): "));
      email = email || (await askQuestion("Enter Official Email: "));
      password = password || (await askQuestion("Enter Strong Password (min 8 chars): "));
    }

    rl.close();

    // Validate using Zod schema
    const validation = initialAdminBootstrapSchema.safeParse({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password
    });

    if (!validation.success) {
      console.error("\n[Validation Error] The provided credentials failed security checks:");
      for (const issue of validation.error.issues) {
        console.error(` - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }

    const { name: validName, email: validEmail, password: validPassword } = validation.data;

    // Check if email already used by any account
    const existingEmail = await Admin.findOne({ email: validEmail });
    if (existingEmail) {
      console.error(`\n[Error] An administrator with email "${validEmail}" already exists.`);
      process.exit(1);
    }

    // Hash password with bcrypt
    const passwordHash = await Admin.hashPassword(validPassword);

    // Create Super Admin record
    const superAdmin = await Admin.create({
      name: validName,
      email: validEmail,
      passwordHash,
      role: "super_admin",
      status: "active"
    });

    console.log("\n-------------------------------------------------------");
    console.log(" [SUCCESS] Initial Super Admin Created Successfully!");
    console.log(` Account ID : ${superAdmin._id}`);
    console.log(` Name       : ${superAdmin.name}`);
    console.log(` Email      : ${superAdmin.email}`);
    console.log(` Role       : ${superAdmin.role}`);
    console.log(` Status     : ${superAdmin.status}`);
    console.log("-------------------------------------------------------\n");
    console.log("You can now sign in at http://localhost:5173/admin/login.\n");
  } catch (error) {
    console.error("\n[Bootstrap Failed] Error during setup:", error.message);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

bootstrapSuperAdmin();
