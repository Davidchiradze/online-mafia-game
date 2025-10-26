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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[480px] flex flex-col gap-4 text-center p-6">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-gray-500">
          {email
            ? `We sent a confirmation link to ${email}.`
            : "We sent a confirmation link to your email."}
        </p>
      </div>
    </div>
  );
}
