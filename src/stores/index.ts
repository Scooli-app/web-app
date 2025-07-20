// Export all stores
export { useAuthStore } from "./auth.store";
export { useDocumentStore } from "./document.store";
export { useUIStore } from "./ui.store";

// Root store type (for TypeScript)
export interface RootStore {
  auth: ReturnType<typeof import("./auth.store").useAuthStore>;
  document: ReturnType<typeof import("./document.store").useDocumentStore>;
  ui: ReturnType<typeof import("./ui.store").useUIStore>;
}

// Store initialization helper
export const initializeStores = () => {
  // This function can be used to initialize stores with default values
  // or to set up any cross-store dependencies
  console.log("Stores initialized");
};
