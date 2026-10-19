import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .min(1, "Email cannot be empty")
    .email("Please enter a valid email address")
    .max(120, "Email must not exceed 120 characters"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty")
    .max(128, "Password must not exceed 128 characters")
});

export const initialAdminBootstrapSchema = z.object({
  name: z
    .string({ required_error: "Admin name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  email: z
    .string({ required_error: "Admin email is required" })
    .trim()
    .min(1, "Email cannot be empty")
    .email("Please enter a valid email address")
    .max(120, "Email must not exceed 120 characters"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password must not exceed 128 characters")
});

export default { adminLoginSchema, initialAdminBootstrapSchema };
