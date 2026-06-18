// Ambient declarations for side-effect CSS imports (e.g. `import "./globals.css"`).
// Without these, TypeScript reports TS2882 for global stylesheet imports.
declare module "*.css";
