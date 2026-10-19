import { z } from "zod";

export const updateProfileSchema = z.object({
  avatarMedia: z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid profile image").nullable().optional(),
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

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])/,
        "New password must contain at least one letter and one number"
      ),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"]
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"]
  });

export default {
  updateProfileSchema,
  changePasswordSchema
};
