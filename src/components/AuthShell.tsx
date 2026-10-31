export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-4 py-10">
      <a href="/" className="mb-6 flex items-center gap-3 self-start">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400 text-lg font-black text-zinc-950">B</span>
        <span className="text-lg font-bold">BulkBuddy</span>
      </a>
      <h1 className="self-start text-2xl font-bold">{title}</h1>
      <p className="mb-6 self-start text-sm text-zinc-400">{subtitle}</p>
      <div className="w-full flex justify-center">{children}</div>
      <a href="/" className="mt-6 text-sm text-lime-300 underline">Continue as guest →</a>
      <p className="mt-10 text-center text-[11px] text-zinc-500">⚕️ Not Medical Advice. Does not diagnose or prescribe. Use made-up data while testing.</p>
    </div>
  );
}
