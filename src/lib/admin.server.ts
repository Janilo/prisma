// Server-only. The `.server.ts` suffix prevents Vite from bundling this
// into the client. Never import from client code.
import { ADMIN_EMAIL } from "./config";

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL;
}
