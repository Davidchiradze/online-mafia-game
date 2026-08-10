import HeadquartersWrapper from "@/features/headquarters/components/HeadquartersWrapper";

export default function HeadquartersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HeadquartersWrapper>{children}</HeadquartersWrapper>;
}
