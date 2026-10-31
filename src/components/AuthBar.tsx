"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { CLERK_ON } from "@/lib/clerk";

// Links the browser's data to the signed-in account (and back to guest on sign-out).
function AccountSync() {
  const { isLoaded, isSignedIn } = useUser();
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const current = localStorage.getItem("bb_device");
      if (isSignedIn) {
        fetch("/api/me").then((r) => r.json()).then((d) => {
          if (d?.signedIn && d.uuid && d.uuid !== current) {
            if (current && !localStorage.getItem("bb_guest_device")) localStorage.setItem("bb_guest_device", current);
            localStorage.setItem("bb_device", d.uuid);
            localStorage.removeItem("bb_day");
            localStorage.removeItem("bb_weights");
            location.reload(); // reload so the dashboard pulls this account's data from the cloud
          }
        }).catch(() => {});
      } else {
        const guest = localStorage.getItem("bb_guest_device");
        if (guest && guest !== current) {
          localStorage.setItem("bb_device", guest);
          localStorage.removeItem("bb_day");
          localStorage.removeItem("bb_weights");
          location.reload();
        }
      }
    } catch {}
  }, [isLoaded, isSignedIn]);
  return null;
}

export default function AuthBar() {
  if (!CLERK_ON) return null;
  return (
    <div className="flex items-center">
      <AccountSync />
      <SignedOut>
        <a href="/sign-in" className="rounded-xl border border-white/15 px-3 py-1.5 text-sm font-medium text-zinc-200">Sign in</a>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  );
}
