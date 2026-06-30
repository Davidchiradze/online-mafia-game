import AuthGate from "@/components/dashboard/AuthGate";
import HeadquartersWrapper from "@/components/dashboard/HeadquartersWrapper";

export default function HeadquartersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <HeadquartersWrapper>{children}</HeadquartersWrapper>
    </AuthGate>
  );
}
