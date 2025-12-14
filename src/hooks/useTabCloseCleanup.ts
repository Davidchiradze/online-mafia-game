// "use client";

// import { useEffect } from "react";
// import { Room as LiveKitRoom } from "livekit-client";

// type UseTabCloseCleanupOptions = {
//   gameId: string;
//   room: LiveKitRoom;
//   enabled?: boolean;
//   onCleanup?: () => void;
// };

// /**
//  * Hook to handle cleanup when user closes the browser tab or navigates away.
//  * Ensures proper disconnection of LiveKit room and cleanup of player records.
//  */
// export function useTabCloseCleanup({
//   gameId,
//   room,
//   enabled = true,
//   onCleanup,
// }: UseTabCloseCleanupOptions) {
//   useEffect(() => {
//     if (!enabled) return;

//     const handleBeforeUnload = () => {
//       // Try to disconnect LiveKit room synchronously
//       try {
//         room.disconnect();
//       } catch {
//         // Ignore errors during unload
//       }

//       // Call optional cleanup callback
//       if (onCleanup) {
//         try {
//           onCleanup();
//         } catch {
//           // Ignore errors during unload
//         }
//       }

//       // Use fetch with keepalive for reliable cleanup
//       // This ensures the server action is called even if the page is closing
//       // keepalive: true allows the request to complete even after the page
//       fetch(`/api/game/${gameId}/leave`, {
//         method: "POST",
//         keepalive: true,
//         credentials: "include",
//       }).catch(() => {
//         // Ignore errors - page is closing
//       });
//     };

//     const handlePageHide = (event: PageTransitionEvent) => {
//       // pagehide is more reliable than beforeunload for cleanup
//       if (event.persisted) {
//         // Page is being cached (e.g., back/forward navigation)
//         // Still try to cleanup, but it's less critical
//         return;
//       }
//       handleBeforeUnload();
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);
//     window.addEventListener("pagehide", handlePageHide);

//     return () => {
//       window.removeEventListener("beforeunload", handleBeforeUnload);
//       window.removeEventListener("pagehide", handlePageHide);
//     };
//   }, [gameId, room, enabled, onCleanup]);
// }
