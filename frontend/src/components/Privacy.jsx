import React from "react";

export default function Privacy() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#07090b] font-sans text-white selection:bg-amber-300/30">
      <style>{`
        @keyframes gd-float-a {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(45px,-30px,0) scale(1.08); }
        }
        @keyframes gd-float-b {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-35px,25px,0) scale(.94); }
        }
        @keyframes gd-float-c {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,40px,0); }
        }
        @keyframes gd-grid {
          from { transform: translateY(0); }
          to { transform: translateY(48px); }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[12%] -top-[18%] h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-3xl motion-safe:animate-[gd-float-a_12s_ease-in-out_infinite]" />
        <div className="absolute -right-[8%] top-[8%] h-[360px] w-[360px] rounded-full bg-violet-500/15 blur-3xl motion-safe:animate-[gd-float-b_15s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[18%] left-[32%] h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl motion-safe:animate-[gd-float-c_10s_ease-in-out_infinite]" />

        <div
          className="absolute inset-0 opacity-70 motion-safe:animate-[gd-grid_8s_linear_infinite]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to bottom, black, transparent 88%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 88%)",
          }}
        />

        <span className="absolute left-[18%] top-[30%] h-2 w-2 animate-pulse rounded-full bg-indigo-500/100" />
        <span className="absolute right-[23%] top-[24%] h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
        <span className="absolute bottom-[28%] right-[14%] h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
      </div>

      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <a href="/" className="flex shrink-0 items-center gap-2.5 text-white no-underline">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl text-white shadow-xl shadow-indigo-500/25">✦</span>
          <span>
            <strong className="block text-sm tracking-tight">Goal2Done</strong>
            <small className="mt-0.5 block text-[9px] font-extrabold tracking-[2px] text-white/45">PERSONAL AGENT</small>
          </span>
        </a>

        <div className="hidden items-center gap-7 sm:flex">
          <a href="/" className="text-xs font-bold text-white/60 transition hover:text-white">Home</a>
          <a href="/terms" className="text-xs font-bold text-white/60 transition hover:text-white">Terms</a>
          <a href="/privacy" className="text-xs font-bold text-amber-300">Privacy</a>
        </div>

        <a href="/?login=1" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white/[.055] px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-amber-100">
          Log in
        </a>
      </nav>

      <section className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
        <div className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[10px] font-black tracking-[1.8px] text-amber-200 backdrop-blur">
          ✦ PRIVACY & TRUST
        </div>

        <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-2px] sm:text-6xl">
          Your data.{" "}
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300 bg-clip-text text-transparent">
            Your control.
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
          How Goal2Done handles account information, connected Google services,
          application data, and security.
        </p>

        <article className="mt-8 rounded-[28px] border border-white/10/90 bg-white/[.055]/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,.09)] backdrop-blur-xl sm:p-10 lg:p-12">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-100 pb-6">
            <div>
              <div className="text-[10px] font-black tracking-[2px] text-indigo-300">GOAL2DONE</div>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">Privacy Policy</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-extrabold text-slate-500">Updated Oct 1, 2026</span>
          </div>

          <p className="mt-6 text-sm leading-7 text-slate-600">
            Goal2Done is an application that helps users plan and execute personal tasks using connected services and automation.
          </p>

          <Section title="Information We Collect">
            <p>When you sign in with Google, we may receive basic account information such as your Google account ID, name, and email address.</p>
            <p>If you choose to connect Google services, Goal2Done may request access to Google Calendar, Gmail, Google Drive, Google Docs, and Google Sheets. We only use permissions necessary to provide features you request.</p>
          </Section>

          <Section title="How We Use Information">
            <ul className="list-disc space-y-2 pl-5">
              <li>Authenticate your account.</li>
              <li>Provide Goal2Done features.</li>
              <li>Execute tasks that you request.</li>
              <li>Access connected Google services when you authorize that access.</li>
              <li>Maintain account and application security.</li>
            </ul>
          </Section>

          <Section title="Google Data">
            <p>Goal2Done uses Google APIs to provide features requested by users. Google user data is used only to provide the functionality described in the application.</p>
            <p>We do not sell your personal information or Google user data.</p>
          </Section>

          <Section title="Data Security">
            <p>We take reasonable measures to protect account information and authorization credentials from unauthorized access.</p>
          </Section>

          <Section title="Third-Party Services">
            <p>Goal2Done may use third-party services such as Google APIs, Supabase, Vercel, and AI services to provide application functionality.</p>
          </Section>

          <Section title="Data Retention">
            <p>We retain account and application data only as necessary to provide the service or for legitimate operational purposes.</p>
            <p>You may disconnect your Google account or stop using Goal2Done at any time.</p>
          </Section>

          <Section title="Contact">
            <p>If you have questions about this Privacy Policy, contact:</p>
            <a href="mailto:mounimounikav3417@gmail.com" className="font-extrabold text-indigo-300 hover:text-indigo-300">
              mounimounikav3417@gmail.com
            </a>
          </Section>
        </article>

        <Footer />
      </section>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2.5 text-lg font-extrabold tracking-tight text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-500">{children}</div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-wrap justify-between gap-4 px-1 py-6 text-[11px] text-white/45">
      <span>Goal2Done · Plan, execute, verify.</span>
      <div className="flex flex-wrap gap-5">
        <a href="/" className="font-bold text-slate-500 hover:text-indigo-300">Home</a>
        <a href="/terms" className="font-bold text-slate-500 hover:text-amber-300">Terms</a>
        <a href="/privacy" className="font-bold text-slate-500 hover:text-amber-300">Privacy</a>
        <a href="mailto:mounimounikav3417@gmail.com" className="font-bold text-slate-500 hover:text-indigo-300">Contact</a>
      </div>
    </footer>
  );
}
