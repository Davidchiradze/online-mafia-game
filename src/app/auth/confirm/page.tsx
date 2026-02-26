import Link from "next/link";
import { MailCheck } from "lucide-react";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawEmail = sp?.email;
  const email = Array.isArray(rawEmail)
    ? decodeURIComponent(rawEmail[0] ?? "")
    : decodeURIComponent(rawEmail ?? "");

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-10 shadow-[0_0_60px_rgba(0,0,0,0.5)] text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(220,38,38,0.35)]">
          <MailCheck className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-orbitron font-bold text-white mb-3 tracking-tight">
          Check Your Email
        </h1>
        <p className="text-gray-500 font-sans text-sm leading-relaxed mb-2">
          {email ? (
            <>
              We sent a confirmation link to{" "}
              <span className="text-gray-300 font-medium">{email}</span>.
            </>
          ) : (
            "We sent a confirmation link to your email address."
          )}
        </p>
        <p className="text-gray-600 font-sans text-xs leading-relaxed mb-8">
          Click the link in the email to activate your account. Check your spam folder if you don&apos;t see it.
        </p>

        {/* Divider */}
        <div className="mb-6 h-px bg-white/[0.06]" />

        <Link
          href="/auth/signin"
          className="block w-full py-3 px-4 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white font-sans text-sm font-medium transition-all"
        >
          Back to Sign In
        </Link>
      </div>

    </div>
  );
}
