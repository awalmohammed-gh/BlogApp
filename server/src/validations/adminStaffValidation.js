import { z } from "zod";

export const inviteStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  role: z.enum(["editor", "author"], {
    errorMap: () => ({ message: "Invited role must be either 'editor' or 'author'" })
  })
});

export const updateStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(500, "Biography cannot exceed 500 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters")
    .optional()
});

export const changeStaffRoleSchema = z.object({
  role: z.enum(["editor", "author"], {
    errorMap: () => ({ message: "Role must be either 'editor' or 'author'" })
  })
});

export const changeStaffStatusSchema = z.object({
  status: z.enum(["active", "disabled"], {
    errorMap: () => ({ message: "Status must be either 'active' or 'disabled'" })
  })
});

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(10, "Invitation token is invalid or missing"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])/,
        "Password must contain at least one letter and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and confirmation do not match",
    path: ["confirmPassword"]
  });

export default {
  inviteStaffSchema,
  updateStaffSchema,
  changeStaffRoleSchema,
  changeStaffStatusSchema,
  acceptInvitationSchema
};
