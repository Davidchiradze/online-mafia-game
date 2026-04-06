export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative h-dvh overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1568450902879-3b3ffb882ecb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2l0eSUyMG5pZ2h0JTIwc2t5bGluZSUyMG5vaXJ8ZW58MXx8fHwxNzcyMTE2NjM5fDA&ixlib=rb-4.1.0&q=80&w=1080"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80 pointer-events-none" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
