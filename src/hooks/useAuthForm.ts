"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  signInSchema,
  signUpSchema,
  SignInFormData,
  SignUpFormData,
} from "@/lib/auth/schemas";
import { signInAction, signUpAction } from "@/lib/auth/actions";

type Mode = "signin" | "signup";

export function useAuthForm(mode: Mode) {
  const [serverError, setServerError] = useState("");
  const schema = useMemo(
    () => (mode === "signup" ? signUpSchema : signInSchema),
    [mode]
  );
  const form = useForm<SignInFormData | SignUpFormData>({
    resolver: zodResolver(schema as any),
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "all",
    defaultValues:
      mode === "signup"
        ? { email: "", password: "", confirmPassword: "", nickname: "" }
        : { email: "", password: "" },
  });

  async function onSubmit(values: SignInFormData | SignUpFormData) {
    setServerError("");
    if (mode === "signup") {
      const res = await signUpAction(values as SignUpFormData);
      if (res && "success" in res && !res.success) setServerError(res.error);
    } else {
      const res = await signInAction(values as SignInFormData);
      if (res && "success" in res && !res.success) setServerError(res.error);
    }
  }

  return { form, onSubmit, serverError };
}
