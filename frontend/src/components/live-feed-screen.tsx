"use client";

import { LanguageBadge } from "@/components/language-badge";
import type { FeedItem } from "@/lib/api";

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

export function LiveFeedScreen({ feed }: { feed: FeedItem[] }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel/40">
      <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Live Event Feed</h2>
        <span className="text-xs text-slate-500">original text vs. extracted JSON</span>
      </div>
      <div className="max-h-[600px] divide-y divide-panel-border overflow-y-auto">
        {feed.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No reports yet. Seed the simulation.</div>
        ) : (
          feed.map(({ report, signal }) => (
            <div key={report.id} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-2">
              <div className="flex gap-2">
                <LanguageBadge language={report.source_language} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">{report.raw_text}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {report.location_name} · {timeFmt.format(new Date(report.reported_at))} IST
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-panel-border bg-black/30 p-2">
                {signal ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-emerald-300">
                    {JSON.stringify(signal, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-slate-600">not processed yet</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
