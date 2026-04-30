import { Lock } from "lucide-react";

type ComingSoonPageProps = {
  title: string;
  description: string;
};

export default function ComingSoonPage({
  title,
  description,
}: ComingSoonPageProps) {
  return (
    <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center p-4 text-white">
      <div className="relative w-full max-w-xl text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/20 blur-[100px]" />

        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/60 p-10 shadow-2xl backdrop-blur-2xl sm:p-14">
          <div className="absolute left-1/2 top-0 h-[2px] w-1/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-70" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-900/40 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
              <Lock className="h-10 w-10 text-red-400" />
            </div>

            <h1 className="mb-4 bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              {title}
            </h1>
            <p className="mx-auto max-w-md text-lg leading-relaxed text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
