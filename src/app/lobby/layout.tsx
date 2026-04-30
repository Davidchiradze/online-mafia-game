import HeadquartersWrapper from "@/components/dashboard/HeadquartersWrapper";

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HeadquartersWrapper>{children}</HeadquartersWrapper>;
}
