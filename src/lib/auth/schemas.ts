import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .refine((v) => v === v.trim(), {
        message: "Remove leading or trailing spaces",
      })
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d).+$/,
        "Password must include letters and numbers"
      ),
    confirmPassword: z.string(),
    nickname: z
      .string()
      .min(2, "Nickname must be at least 2 characters long")
      .max(20, "Nickname must be at most 20 characters long")
      .refine((v) => v === v.trim(), {
        message: "Remove leading or trailing spaces",
      })
      .regex(
        /^[a-zA-Z0-9_\-\.]+$/,
        "Nickname can contain letters, numbers, _ - ."
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .refine((v) => v === v.trim(), {
      message: "Remove leading or trailing spaces",
    })
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
