import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  if (!(token_hash && type)) {
    const errorMessage = "Invalid token";
    redirect(`/auth/login?message=${errorMessage}&type=error`);
  }

  let userSessionData;
  {
    const response = await supabase.auth.verifyOtp({ type, token_hash });

    if (response.error) {
      redirect(`/auth/login?message=${response.error.message}&type=error`);
    }

    userSessionData = response.data;
  }

  update_user_data: {
    if (!userSessionData.user || !userSessionData.user.email) {
      const errorMessage = "Missing user data";
      redirect(`/auth/login?message=${errorMessage}&type=error`);
    }

    const result = await supabase.from("profiles").insert({
      id: userSessionData.user.id,
      email: userSessionData.user.email,
      nickname: userSessionData.user.user_metadata.nickname,
    });

    if (result.error) {
      const errorMessage = "Error inserting user into database";
      redirect(`/auth/login?message=${errorMessage}&type=error`);
    }
  }
  redirect("/");
}
