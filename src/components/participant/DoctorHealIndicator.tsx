"use client";

/**
 * Visual indicator showing who the Doctor has selected to heal.
 * Displayed to the host and the Doctor.
 * Uses green/emerald theme to represent healing.
 */
export default function DoctorHealIndicator() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-emerald-600 text-white ring-4 ring-emerald-400 ring-opacity-50 shadow-lg backdrop-blur-sm">
        <span className="text-lg md:text-xl">💚</span>
      </div>
    </div>
  );
}
