import { Users, Shield, Gamepad2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)]">
          <div className="hidden lg:block space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Online Mafia
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Experience the thrill of deception and deduction in real-time
                multiplayer games
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Multiplayer Experience
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Play with friends or join random tables with up to 10
                    players
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Role-Based Gameplay
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Take on unique roles: Mafia, Don, Detective, or Citizen
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Real-Time Strategy
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Use video chat and voice communication for immersive
                    gameplay
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
