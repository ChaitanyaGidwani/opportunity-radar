"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock4,
  ExternalLink,
  Mail,
  MonitorSmartphone,
  Moon,
  Send,
  Smartphone,
} from "lucide-react";
import type { Nudge } from "@/lib/types";
import { windowLabel } from "@/lib/nudges";
import { formatDate } from "@/lib/format";
import { CATEGORY_ICON, CATEGORY_COLOR } from "../feed/category-icon";
import { DeadlineCountdown } from "../feed/deadline-countdown";
import { Button } from "../ui/button";
import { Toggle } from "../ui/primitives";
import { useProfile } from "@/store/profile";
import { useCollections } from "@/store/collections";
import { useNudges } from "@/store/nudges";
import { usePrefs } from "@/store/prefs";
import { useToastStore } from "@/store/toast";
import { auth } from "@/lib/firebase";
import { enablePush, pushPermission, sendTestPush } from "@/lib/push-client";
import { cn } from "@/lib/utils";

const WINDOW_TONE: Record<string, string> = {
  "T-3h": "text-danger border-danger/30 bg-danger/10",
  "T-1d": "text-amber border-amber/30 bg-amber/10",
  "T-3d": "text-amber/90 border-amber/25 bg-amber/[0.07]",
  "T-7d": "text-info border-info/25 bg-info/10",
  "T-14d": "text-ink-2 border-line-strong bg-elevated",
};

export function NotificationsClient() {
  const profile = useProfile((s) => s.profile);
  const phyd = useProfile((s) => s.hydrated);
  const saved = useCollections((s) => s.saved);
  const chyd = useCollections((s) => s.hydrated);

  const nudges = useNudges((s) => s.nudges);
  const loading = useNudges((s) => s.loading);
  const load = useNudges((s) => s.load);

  const prefs = usePrefs();
  const [pushState, setPushState] = useState<NotificationPermission | "unsupported">("default");
  const [pushBusy, setPushBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    const id = requestAnimationFrame(() => setPushState(pushPermission()));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (phyd && chyd && profile.onboarded) load(profile, saved, prefs.primaryChannel, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phyd, chyd, saved.join(",")]);

  const due = useMemo(
    () =>
      nudges.filter((n) => {
        const u = prefs.snoozed[n.id];
        const snoozed = !!u && new Date(u).getTime() > now;
        return n.due && !snoozed;
      }),
    [nudges, prefs.snoozed, now],
  );
  const upcoming = useMemo(() => nudges.filter((n) => !n.due), [nudges]);
  const unreadDue = due.filter((n) => !prefs.readIds.includes(n.id));

  const onEnablePush = async () => {
    setPushBusy(true);
    const res = await enablePush();
    setPushState(pushPermission());
    if (res.ok) {
      prefs.setChannel("push", true);
      pushToast("Browser nudges enabled.", "success");
    } else {
      pushToast(res.reason ?? "Couldn't enable push.", "error");
    }
    setPushBusy(false);
  };

  const onTestNudge = async () => {
    setPushBusy(true);
    let successCount = 0;
    const sample = unreadDue[0] ?? due[0] ?? upcoming[0];

    // 1. Test Browser Push
    if (prefs.channels.push && pushState === "granted") {
      const ok = await sendTestPush({
        title: sample ? `⏰ ${windowLabel(sample.window)} — ${sample.title}` : "⏰ Opportunity Radar",
        body: sample?.message ?? "This is how a deadline nudge will reach you.",
        url: "/notifications",
      });
      if (ok) successCount++;
    }

    // 2. Test Email Digest
    if (prefs.channels.email) {
      const userEmail = auth.currentUser?.email;
      if (userEmail) {
        try {
          const res = await fetch("/api/test-nudge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
          });
          if (res.ok) {
            successCount++;
          } else {
            const err = await res.json();
            pushToast(`Email failed: ${err.error}`, "error");
          }
        } catch (e: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
          pushToast(`Email error: ${e.message}`, "error");
        }
      } else {
        pushToast("No email found to send to.", "error");
      }
    }

    if (successCount > 0) {
      pushToast("Test nudge(s) sent successfully!", "success");
    } else if (!prefs.channels.push && !prefs.channels.email) {
      pushToast("Enable Browser Push or Email Digest first.", "error");
    } else if (prefs.channels.push && pushState !== "granted") {
       pushToast("Browser push is enabled but permission not granted.", "error");
    }
    
    setPushBusy(false);
  };

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Deadline nudges</h1>
          <p className="mt-1 text-sm text-ink-2">
            Relative reminders at T-7d, T-3d, T-1d & T-3h — only for high-relevance matches.
          </p>
        </div>
        {unreadDue.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => prefs.markAllRead(due.map((n) => n.id))}>
            <CheckCheck size={15} /> Mark all read
          </Button>
        )}
      </div>

      {/* Channels + push */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <BellRing size={15} className="text-signal-500" /> Delivery channels
          </p>
          <div className="mt-3 space-y-3">
            <ChannelRow icon={<MonitorSmartphone size={16} />} label="In-app center" sub="Always on" checked={prefs.channels["in-app"]} onChange={(v) => prefs.setChannel("in-app", v)} />
            <ChannelRow
              icon={<Smartphone size={16} />}
              label="Browser push"
              sub={
                pushState === "granted"
                  ? "Live on this device"
                  : pushState === "denied"
                    ? "Blocked — enable in browser settings"
                    : pushState === "unsupported"
                      ? "Not supported here"
                      : "Free, instant, works offline"
              }
              checked={prefs.channels.push && pushState === "granted"}
              onChange={async (v) => {
                if (v && pushState !== "granted") await onEnablePush();
                else prefs.setChannel("push", v);
              }}
              disabled={pushState === "unsupported" || pushState === "denied"}
            />
            <ChannelRow icon={<Mail size={16} />} label="Email digest" sub="Resend (configure RESEND_API_KEY)" checked={prefs.channels.email} onChange={(v) => prefs.setChannel("email", v)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {pushState !== "granted" && pushState !== "unsupported" && (
              <Button size="sm" onClick={onEnablePush} disabled={pushBusy}>
                <Bell size={14} /> Enable browser nudges
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={onTestNudge} disabled={pushBusy}>
              <Send size={14} /> Send me a test nudge
            </Button>
          </div>
        </div>

        {/* Anti-fatigue prefs */}
        <div className="panel p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Moon size={15} className="text-signal-500" /> Quiet hours & limits
          </p>
          <div className="mt-3 space-y-3 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-2">Quiet hours (IST)</span>
              <span className="flex items-center gap-1.5">
                <HourSelect value={prefs.quietStart} onChange={(v) => prefs.setPref("quietStart", v)} />
                <span className="text-ink-3">to</span>
                <HourSelect value={prefs.quietEnd} onChange={(v) => prefs.setPref("quietEnd", v)} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-2">Max nudges / day</span>
              <input
                type="number"
                min={1}
                max={12}
                value={prefs.frequencyCap}
                onChange={(e) => prefs.setPref("frequencyCap", Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-center font-mono text-ink outline-none focus:border-ink-3"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-2">Weekly “new matches” digest</span>
              <Toggle checked={prefs.weeklyDigest} onChange={(v) => prefs.setPref("weeklyDigest", v)} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-7 space-y-6">
        <NudgeSection
          title="Due now"
          empty="No deadlines need your attention right now. Save more opportunities to get nudged."
          nudges={due}
          loading={loading && nudges.length === 0}
          read={prefs.readIds}
          onRead={(id) => prefs.markRead(id)}
          onSnooze={(id) => prefs.snooze(id, new Date(Date.now() + 86_400_000).toISOString())}
        />
        <NudgeSection
          title="Scheduled"
          empty="Upcoming reminders will appear here as deadlines approach."
          nudges={upcoming}
          loading={loading && nudges.length === 0}
          read={prefs.readIds}
          onRead={(id) => prefs.markRead(id)}
          onSnooze={(id) => prefs.snooze(id, new Date(Date.now() + 86_400_000).toISOString())}
          scheduled
        />
      </div>

    </div>
  );
}

function ChannelRow({
  icon,
  label,
  sub,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", disabled && "opacity-60")}>
      <span className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-elevated text-ink-2">{icon}</span>
        <span>
          <span className="block text-[13px] font-medium text-ink">{label}</span>
          <span className="block text-[11px] text-ink-3">{sub}</span>
        </span>
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function HourSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 rounded-lg border border-line bg-surface px-2 font-mono text-[13px] text-ink outline-none focus:border-ink-3"
    >
      {Array.from({ length: 24 }).map((_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}

function NudgeSection({
  title,
  empty,
  nudges,
  loading,
  read,
  onRead,
  onSnooze,
  scheduled,
}: {
  title: string;
  empty: string;
  nudges: Nudge[];
  loading: boolean;
  read: string[];
  onRead: (id: string) => void;
  onSnooze: (id: string) => void;
  scheduled?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
        {title}
        <span className="rounded-full bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{nudges.length}</span>
      </h2>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : nudges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-3">{empty}</p>
      ) : (
        <div className="space-y-2">
          {nudges.slice(0, 30).map((n) => {
            const Icon = CATEGORY_ICON[n.category];
            const isRead = read.includes(n.id);
            return (
              <div
                key={n.id}
                className={cn(
                  "panel flex items-start gap-3 p-3.5 transition-opacity",
                  isRead && "opacity-60",
                )}
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${CATEGORY_COLOR[n.category]} 14%, transparent)`, color: CATEGORY_COLOR[n.category] }}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase", WINDOW_TONE[n.window])}>
                      {windowLabel(n.window)}
                    </span>
                    {!scheduled && !isRead && <span className="h-1.5 w-1.5 rounded-full bg-signal-500" />}
                    {scheduled && (
                      <span className="flex items-center gap-1 text-[11px] text-ink-3">
                        <Clock4 size={11} /> fires {formatDate(n.fireAt)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-ink">{n.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <DeadlineCountdown deadline={n.deadline} size="sm" />
                    <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-signal-600 hover:text-signal-700">
                      Apply <ExternalLink size={12} />
                    </a>
                    {!scheduled && (
                      <>
                        <button onClick={() => onSnooze(n.id)} className="text-[12px] text-ink-3 hover:text-ink-2">
                          Snooze 1d
                        </button>
                        {!isRead && (
                          <button onClick={() => onRead(n.id)} className="text-[12px] text-ink-3 hover:text-ink-2">
                            Mark read
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
