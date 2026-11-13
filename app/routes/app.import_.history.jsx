// Past option imports and restores, with a Restore button for each product that was changed.
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { backgroundRunnerFor } from "../import/background.server.js";
import { staffFrom } from "../import/staff.server.js";
import { hasOptionsToRestore, runPlans, runView, startRestore } from "../import/import-run.server.js";
import { ResultRows, RunProgress } from "../import/run-progress.jsx";

const HISTORY_LENGTH = 50;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const runs = await db.importRun.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LENGTH,
    include: { backups: { select: { id: true, restoredAt: true, data: true } } },
  });
  return {
    runs: runs.map((run) => {
      const open = new Set(
        run.backups
          .filter((b) => !b.restoredAt && hasOptionsToRestore(b.data))
          .map((b) => b.id),
      );
      const view = runView(run);
      return {
        id: run.id,
        kind: run.kind,
        status: view.status,
        fileName: run.fileName,
        createdBy: run.createdBy,
        createdByName: run.createdByName,
        createdAt: run.createdAt,
        total: run.total,
        // Restorable: the product was written, and its backup has options and is not restored yet.
        results: view.results.map((r) => ({
          ...r,
          restorable:
            (r.status === "imported" || r.status === "restored") && open.has(r.backupId),
        })),
      };
    }),
  };
};

export const action = async ({ request }) => {
  const { admin, session, sessionToken } = await authenticate.admin(request);
  const staff = staffFrom(session, sessionToken);
  const form = await request.formData();
  const started = await startRestore({
    db,
    graphql: admin.graphql,
    shop: session.shop,
    backupId: String(form.get("backupId") ?? ""),
    createdBy: staff.id,
    createdByName: staff.name,
  });
  if (started.error) return { error: started.error };
  backgroundRunnerFor(session.shop)((graphql) =>
    runPlans({ db, graphql, run: started.run, plans: [started.plan] }),
  );
  return { runId: started.run.id };
};

const when = (iso) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

export default function ImportHistory() {
  const { runs } = useLoaderData();
  const answer = useActionData();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  // Only the button that was pressed shows its spinner; the others wait, disabled.
  const restoring = busy ? navigation.formData?.get("backupId") : null;

  const restoreButton = (result) =>
    result.restorable ? (
      <Form
        method="post"
        onSubmit={(event) => {
          // eslint-disable-next-line no-alert, no-undef
          if (!confirm(`Put ${result.title} back to how it was before this change?`))
            event.preventDefault();
        }}
      >
        <input type="hidden" name="backupId" value={result.backupId} />
        <s-button
          type="submit"
          loading={restoring === result.backupId || undefined}
          disabled={busy || undefined}
        >
          Restore
        </s-button>
      </Form>
    ) : null;

  return (
    <s-page heading="Import history">
      <s-section>
        <s-paragraph>
          The last {HISTORY_LENGTH} imports and restores. Restore puts a product&apos;s
          options back to how they were just before that import; the restore itself can
          be undone the same way.
        </s-paragraph>
      </s-section>
      {answer?.error && (
        <s-section>
          <s-banner tone="critical" heading="Not restored. Nothing has been changed.">
            {answer.error}
          </s-banner>
        </s-section>
      )}
      {answer?.runId && (
        <s-section>
          <RunProgress runId={answer.runId} />
        </s-section>
      )}
      {runs.length === 0 && (
        <s-section>
          <s-text>Nothing has been imported yet.</s-text>
        </s-section>
      )}
      {runs.map((run) => (
        <s-section
          key={run.id}
          heading={`${when(run.createdAt)} · ${run.kind === "restore" ? "Restore" : "Import"}${run.fileName ? ` · ${run.fileName}` : ""}`}
        >
          <s-stack direction="block" gap="base">
            {run.status !== "done" && (
              <s-badge tone={run.status === "running" ? "info" : "warning"}>
                {run.status === "running" ? "Running" : "Stopped part-way"}
              </s-badge>
            )}
            {(run.createdByName || run.createdBy) && (
              <s-text tone="subdued">Run by {run.createdByName || `user ${run.createdBy}`}</s-text>
            )}
            <ResultRows results={run.results} action={restoreButton} />
          </s-stack>
        </s-section>
      ))}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
