// Progress and results of an option import or restore, read from the server every 2 seconds
// while it runs. Used by the Options import page and the Import history page.
import { useEffect, useState } from "react";

const POLL_MS = 2000;
const RETRY_MS = 4000;

const BADGES = {
  imported: { tone: "success", text: "Imported" },
  restored: { tone: "success", text: "Restored" },
  failed: { tone: "critical", text: "Not changed" },
  stopped: { tone: "warning", text: "Check this product" },
};

function badgeFor(result) {
  // A failed product that may have changed is not "Not changed".
  if (result.status === "failed" && result.message?.startsWith("Check this product"))
    return BADGES.stopped;
  // Written but not ready to sell.
  if ((result.status === "imported" || result.status === "restored") && result.ready === false)
    return { tone: "warning", text: "Written, not ready" };
  return BADGES[result.status] ?? { tone: "info", text: result.status };
}

/** The badge for one product's result. */
export function ResultBadge({ result }) {
  const { tone, text } = badgeFor(result);
  return <s-badge tone={tone}>{text}</s-badge>;
}

const titleOf = (result) =>
  `${result.title ?? "Product"} (CFS ${result.cfsProductId})`;

/** One line per product with its result, and a slot for an action beside it. */
export function ResultRows({ results, action }) {
  return (
    <s-stack direction="block" gap="small-200">
      {results.map((result) => (
        <s-stack
          key={result.cfsProductId}
          direction="inline"
          gap="base"
          alignItems="center"
        >
          <ResultBadge result={result} />
          <s-text>
            {titleOf(result)}: {result.message}
          </s-text>
          {action?.(result)}
        </s-stack>
      ))}
    </s-stack>
  );
}

function headline(run) {
  const finished = run.results.filter((r) => r.status !== "stopped").length;
  const verb = run.kind === "restore" ? "Restored" : "Imported";
  if (run.status === "running") return `${verb} ${finished} of ${run.total}…`;
  const failed = run.results.filter(
    (r) => r.status === "failed" || r.status === "stopped",
  ).length;
  if (run.status === "stopped")
    return "Stopped part-way: check the products marked below";
  return failed
    ? `Finished: ${finished - failed} done, ${failed} to look at`
    : `Finished: ${finished} product${finished === 1 ? "" : "s"} done`;
}

export function RunProgress({ runId }) {
  const [run, setRun] = useState(null);
  const [trouble, setTrouble] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const response = await fetch(`/app/import/runs/${runId}`);
        if (!response.ok) throw new Error("not ok");
        const view = await response.json();
        if (cancelled) return;
        setRun(view);
        setTrouble(false);
        if (view.status === "running") timer = setTimeout(poll, POLL_MS);
      } catch {
        if (cancelled) return;
        setTrouble(true);
        timer = setTimeout(poll, RETRY_MS);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId]);

  if (!run) {
    return (
      <s-banner tone="info" heading="Starting…">
        {trouble ? "Progress could not be read just now; trying again." : null}
      </s-banner>
    );
  }
  const tone =
    run.status === "running"
      ? "info"
      : run.status === "stopped" ||
          run.results.some((r) => r.status === "failed" || r.ready === false)
        ? "warning"
        : "success";
  return (
    <s-banner tone={tone} heading={headline(run)}>
      <s-stack direction="block" gap="base">
        {trouble && (
          <s-text>Progress could not be read just now; trying again.</s-text>
        )}
        <ResultRows results={run.results} />
        {run.status !== "running" && (
          <s-link href="/app/import/history">Open import history</s-link>
        )}
      </s-stack>
    </s-banner>
  );
}
