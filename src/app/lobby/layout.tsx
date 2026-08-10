import HeadquartersWrapper from "@/features/headquarters/components/HeadquartersWrapper";

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HeadquartersWrapper>{children}</HeadquartersWrapper>;
}
