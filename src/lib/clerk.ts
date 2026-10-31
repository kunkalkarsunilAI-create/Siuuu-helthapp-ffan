// Login is OPTIONAL (the brief requires the app to open with no sign-up).
// Clerk is only switched on when both keys are set in Vercel, so the app never breaks without them.
export const CLERK_ON = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
