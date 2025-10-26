"use server";

import { createClient } from "@/lib/supabase/server";
import { SignInFormData, SignUpFormData } from "./schemas";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";

export type SignUpActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: { email?: string; nickname?: string };
      message?: string;
    };

export async function signInAction(input: SignInFormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) return { success: false, error: error.message } as const;
  redirect("/lobby");
}

export async function signUpAction(
  input: SignUpFormData
): Promise<SignUpActionResult | void> {
  const supabase = adminClient;

  const [
    { data: emailData, error: emailError },
    { data: nicknameData, error: nicknameError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("email", input.email)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id")
      .eq("nickname", input.nickname)
      .limit(1)
      .maybeSingle(),
  ]);

  if (emailError || nicknameError)
    return { success: false, message: (emailError || nicknameError)!.message };

  const fieldErrors: { email?: string; nickname?: string } = {};
  if (emailData) fieldErrors.email = "Email is already in use";
  if (nicknameData) fieldErrors.nickname = "Nickname is already taken";
  if (fieldErrors.email || fieldErrors.nickname)
    return { success: false, fieldErrors };

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { nickname: input.nickname } },
  });
  if (error) return { success: false, message: error.message };
  if (!data.user) return { success: false, message: "Unable to create user" };
  redirect("/auth/confirm?email=" + input.email);
}

export async function checkUniqueAction(
  field: "email" | "nickname",
  value: string
) {
  if (!value) return { ok: false, exists: false } as const;
  if (field === "email") {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("email", "%" + value + "%")
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, exists: false } as const;
    return { ok: true, exists: !!data } as const;
  }
  if (field === "nickname") {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("nickname", "%" + value + "%")
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, exists: false } as const;
    return { ok: true, exists: !!data } as const;
  }
  return { ok: false, exists: false } as const;
}
