import { SignUp } from "@clerk/nextjs";
import { CLERK_ON } from "@/lib/clerk";
import AuthShell from "@/components/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell title="Create your BulkBuddy account" subtitle="Optional: saves your bulk progress across devices.">
      {CLERK_ON ? (
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" />
      ) : (
        <p className="text-sm text-amber-300">Sign-up isn&apos;t configured yet (Clerk keys missing). You can keep using the app as a guest.</p>
      )}
    </AuthShell>
  );
}
