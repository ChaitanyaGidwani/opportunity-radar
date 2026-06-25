"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  Home,
  Star,
  Bookmark,
  Bell,
  User,
  RefreshCw,
  CornerDownLeft,
  ExternalLink,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { ScoredOpportunity } from "@/lib/types";
import { useCommand } from "@/store/command";
import { useProfile } from "@/store/profile";
import { useToastStore } from "@/store/toast";
import { CATEGORY_ICON, CATEGORY_COLOR } from "../feed/category-icon";
import { DeadlineCountdown } from "../feed/deadline-countdown";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const { open, setOpen, toggle } = useCommand();
  const router = useRouter();
  const profile = useProfile((s) => s.profile);
  const pushToast = useToastStore((s) => s.push);

  const [query, setQuery] = useState("");
  const [corpus, setCorpus] = useState<ScoredOpportunity[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // load corpus once when first opened
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      inputRef.current?.focus();
      setActive(0);
    }, 30);
    if (loaded.current) return;
    loaded.current = true;
    fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, sort: "match", scope: "all" }),
    })
      .then((r) => r.json())
      .then((d) => setCorpus(d.items ?? []))
      .catch(() => {});
  }, [open, profile]);

  const actions: Action[] = useMemo(
    () => [
      { id: "feed", label: "Go to Home feed", icon: <Home size={16} />, run: () => router.push("/feed") },
      { id: "foryou", label: "Go to For You", icon: <Star size={16} />, run: () => router.push("/for-you") },
      { id: "saved", label: "Go to Saved & tracked", icon: <Bookmark size={16} />, run: () => router.push("/saved") },
      { id: "alerts", label: "Go to Deadline alerts", icon: <Bell size={16} />, run: () => router.push("/notifications") },
      { id: "profile", label: "Go to Profile", icon: <User size={16} />, run: () => router.push("/profile") },
      {
        id: "rescan",
        label: "Rescan all live sources",
        icon: <RefreshCw size={16} />,
        run: () => {
          fetch("/api/ingest", { method: "POST" });
          pushToast("Rescanning live sources…", "info");
        },
      },
    ],
    [router, pushToast],
  );

  const q = query.toLowerCase().trim();
  const filteredActions = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;
  const results = q
    ? corpus
        .filter((s) => {
          const o = s.opportunity;
          return `${o.title} ${o.organization ?? ""} ${o.tags.join(" ")}`.toLowerCase().includes(q);
        })
        .slice(0, 7)
    : corpus.slice(0, 5);

  const flat = [
    ...filteredActions.map((a) => ({ type: "action" as const, a })),
    ...results.map((s) => ({ type: "result" as const, s })),
  ];

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (i: number) => {
    const item = flat[i];
    if (!item) return;
    if (item.type === "action") {
      item.a.run();
      close();
    } else {
      window.open(item.s.opportunity.sourceUrl, "_blank", "noopener,noreferrer");
      close();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong bg-overlay shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
            onKeyDown={onKeyDown}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-ink-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search opportunities or jump to…"
                className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
              <kbd className="hidden rounded border border-line-strong px-1.5 py-0.5 font-mono text-[10px] text-ink-3 sm:block">ESC</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {filteredActions.length > 0 && (
                <Group label="Actions">
                  {filteredActions.map((a, i) => (
                    <Row key={a.id} active={active === i} onClick={() => choose(i)} onHover={() => setActive(i)}>
                      <span className="text-ink-3">{a.icon}</span>
                      <span className="flex-1 text-[14px] text-ink">{a.label}</span>
                    </Row>
                  ))}
                </Group>
              )}

              {results.length > 0 && (
                <Group label={q ? "Matching opportunities" : "Top matches for you"}>
                  {results.map((s, j) => {
                    const idx = filteredActions.length + j;
                    const Icon = CATEGORY_ICON[s.opportunity.category];
                    return (
                      <Row key={s.opportunity.id} active={active === idx} onClick={() => choose(idx)} onHover={() => setActive(idx)}>
                        <span style={{ color: CATEGORY_COLOR[s.opportunity.category] }}>
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] text-ink">{s.opportunity.title}</span>
                          <span className="block truncate text-[11px] text-ink-3">{s.opportunity.organization ?? s.opportunity.sourceLabel}</span>
                        </span>
                        <DeadlineCountdown deadline={s.opportunity.deadline} size="sm" />
                        <ExternalLink size={13} className="text-ink-3" />
                      </Row>
                    );
                  })}
                </Group>
              )}

              {flat.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-ink-3">No matches for “{query}”.</p>}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
              <span className="flex items-center gap-1"><ArrowUp size={11} /><ArrowDown size={11} /> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft size={11} /> open</span>
              <span className="ml-auto font-mono">⌘K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function Row({
  active,
  onClick,
  onHover,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onHover: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onMouseMove={onHover}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "bg-elevated" : "hover:bg-elevated/60",
      )}
    >
      {children}
    </button>
  );
}
