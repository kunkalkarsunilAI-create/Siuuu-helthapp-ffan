import { SignIn } from "@clerk/nextjs";
import { CLERK_ON } from "@/lib/clerk";
import AuthShell from "@/components/AuthShell";

export default function SignInPage() {
  return (
    <AuthShell title="Sign in to BulkBuddy" subtitle="We'll email you a one-time code. No password needed.">
      {CLERK_ON ? (
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
      ) : (
        <p className="text-sm text-amber-300">Login isn&apos;t configured yet (Clerk keys missing). You can keep using the app as a guest.</p>
      )}
    </AuthShell>
  );
}
