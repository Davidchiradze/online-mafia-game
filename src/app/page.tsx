import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
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
