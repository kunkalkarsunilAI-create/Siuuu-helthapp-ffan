import { createHmac } from "crypto";

export const runtime = "nodejs";

// Returns a stable, secret-derived UUID for the signed-in Clerk user. The app uses it as the
// Supabase "device id", so a signed-in athlete sees the same data on every device. It's derived
// with the server-only CLERK_SECRET_KEY, so nobody can compute another user's id.
export async function GET() {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return Response.json({ signedIn: false, reason: "clerk_not_configured" });
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return Response.json({ signedIn: false });
  const h = createHmac("sha256", process.env.CLERK_SECRET_KEY).update("bulkbuddy:" + userId).digest("hex");
  const uuid = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  return Response.json({ signedIn: true, uuid });
}
