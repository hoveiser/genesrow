import { useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Moon, Sun, Github, ShieldCheck } from "lucide-react";

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("gl-theme");
    if (stored) return stored === "dark";
    return true; // default dark for the brand look
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    localStorage.setItem("gl-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/escrow", label: "Escrow" },
  { to: "/security", label: "Security" },
  { to: "/about", label: "About" },
];

export default function Layout() {
  const { dark, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-gl-mesh text-slate-900 transition-colors dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-white/60 backdrop-blur-xl dark:bg-ink-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gl-gradient text-white shadow-glow">
              <Lock className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight">GenEscrow</span>
              <span className="rounded-full bg-gl-orange/15 px-2 py-0.5 text-xs font-bold text-gl-orange">
                v1.3.0
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
                  (isActive
                    ? "bg-gl-gradient text-white shadow-glow"
                    : "text-slate-600 hover:bg-white/10 dark:text-slate-300")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <a
              href="https://github.com/hoveiser/genesrow"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-slate-600 hover:bg-white/10 dark:text-slate-300"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-slate-600 hover:bg-white/10 dark:text-slate-300"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* mobile nav */}
        <nav className="flex items-center justify-around gap-1 border-t border-white/10 px-2 py-1 md:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                "rounded-lg px-3 py-1.5 text-sm font-medium " +
                (isActive ? "bg-gl-gradient text-white" : "text-slate-600 dark:text-slate-300")
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Deployed &amp; byte-verified on GenLayer StudioNet (chain id 61999)
          </span>
          <a
            className="hover:text-gl-orange"
            href="https://explorer-studio.genlayer.com/address/0x0CF5095A297763A167B0d2f1CDc921b63c100cE4"
            target="_blank"
            rel="noreferrer"
          >
            0x0CF5...c100cE4 on Explorer
          </a>
        </div>
      </footer>
    </div>
  );
}
