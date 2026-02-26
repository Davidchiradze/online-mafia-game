import { LandingLogo } from "./LandingLogo";

const footerLinks = ["About", "Privacy", "Terms", "Contact"];

export function LandingFooter() {
  return (
    <footer className="relative py-16 px-6 border-t border-white/[0.04] bg-[#07070d]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <LandingLogo size="sm" />

          <div className="flex items-center gap-8">
            {footerLinks.map((link) => (
              <a
                key={link}
                href="#"
                className="text-gray-600 hover:text-gray-400 transition-colors font-sans text-[0.8rem]"
              >
                {link}
              </a>
            ))}
          </div>

          <p className="text-gray-700 font-sans text-[0.75rem]">
            &copy; 2026 Mafia Online. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
