import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { AppError, UnauthorizedError } from "@/lib/errors";
import type { Database } from "./types";

// The specific auth failure goes to console.error (server log); the thrown
// UnauthorizedError carries only the user-safe message.
function unauthorized(internalDetail: string): UnauthorizedError {
  console.error(`[auth] ${internalDetail}`);
  return new UnauthorizedError();
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set it as a Cloudflare Worker secret/var.`;
      console.error(`[Supabase] ${message}`);
      throw new AppError("Erro de configuração do servidor.", 500);
    }

    const request = getRequest();

    if (!request?.headers) {
      throw unauthorized("No request headers available");
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      throw unauthorized("No authorization header provided");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw unauthorized("Only Bearer tokens are supported");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw unauthorized("No token provided");
    }

    const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error } = await supabase.auth.getUser(token);
    if (error || !userData?.user) {
      throw unauthorized("Invalid token");
    }

    const user = userData.user;
    if (!user.id) {
      throw unauthorized("No user ID found in token");
    }

    return next({
      context: {
        supabase,
        userId: user.id,
        claims: { sub: user.id, email: user.email },
      },
    });
  },
);
