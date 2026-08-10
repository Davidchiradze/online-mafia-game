// import { LandingNavbar } from "@/features/landing/components/LandingNavbar";
// import { LandingHero } from "@/features/landing/components/LandingHero";
// import { LandingFeatures } from "@/features/landing/components/LandingFeatures";
// import { LandingHowItWorks } from "@/features/landing/components/LandingHowItWorks";
// import { LandingFooter } from "@/features/landing/components/LandingFooter";
import { redirect } from "next/navigation";

export default function Home() {
  return (
    // <div className="min-h-screen bg-[#0a0a12] text-white">
    //   {/* <LandingNavbar />
    //   <LandingHero />
    //   <LandingFeatures />
    //   <LandingHowItWorks />
    //   <LandingFooter /> */}
    // </div>
    redirect("/lobby")
  );
}
