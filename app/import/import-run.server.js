// Option import runs: who may write, one run at a time, a backup before each product is
// changed, a result per product, and Restore (which is a run that writes a backup back).
import { loadConfigurableProduct } from "../pricing/load-product.server.js";
import { checkSharedOptions } from "./shared-options.server.js";
import { writeProduct } from "./write-product.server.js";

// A run not updated for this long is taken to have died with its server.
const STALE_AFTER_MS = 10 * 60 * 1000;

const NOT_SWITCHED_ON = "Importing is not switched on for this store";
const ALREADY_RUNNING =
  "Another import is running for this store; wait for it to finish";
const BACKUP_FAILED = "Not changed: the backup could not be saved";
const STOPPED = "Stopped part-way; check this product";

/** Writing is allowed only for shops listed (comma separated) in the IMPORT_WRITE_SHOPS setting. */
export function writesAllowed(shop) {
  return (process.env.IMPORT_WRITE_SHOPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(shop);
}

/**
 * Starts a run, or refuses. planned: [{ cfsProductId, title }] in the order they will be written.
 * Returns { run } or { error }. A running run older than 10 minutes is first marked stopped, so a
 * server that died mid-import cannot block imports for ever.
 */
export async function beginRun({
  db,
  shop,
  kind,
  createdBy = null,
  fileName = null,
  planned,
  now = new Date(),
}) {
  if (!writesAllowed(shop)) return { error: NOT_SWITCHED_ON };
  await db.importRun.updateMany({
    where: {
      shop,
      status: "running",
      updatedAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) },
    },
    data: { status: "stopped" },
  });
  try {
    const run = await db.importRun.create({
      data: {
        shop,
        kind,
        createdBy,
        fileName,
        status: "running",
        total: planned.length,
        results: { planned, done: [] },
      },
    });
    return { run };
  } catch (error) {
    // The database allows one running run per shop.
    if (error?.code === "P2002") return { error: ALREADY_RUNNING };
    throw error;
  }
}

function messageFor(kind, result) {
  const verb = kind === "restore" ? "Restored" : "Imported";
  if (!result.ok) return result.error;
  if (result.ready) {
    return result.problems.length
      ? `${verb}, ready to sell. ${result.problems.join("; ")}`
      : `${verb}, ready to sell`;
  }
  return `${verb}, but not ready to sell: ${result.problems.join("; ")}`;
}

/**
 * Writes each plan in order: save the product's backup, write it, record the result. A failed
 * product does not stop the others. plans: { cfsProductId, productId, title, current, product,
 * restoreOfBackupId? }. The run ends done.
 */
export async function runPlans({ db, graphql, run, plans, sleep }) {
  const { planned } = run.results;
  const done = [];
  const record = (data) =>
    db.importRun.update({
      where: { id: run.id },
      data: { ...data, results: { planned, done } },
    });

  for (const plan of plans) {
    const entry = {
      cfsProductId: plan.cfsProductId,
      productId: plan.productId,
      title: plan.title,
    };
    let backup = null;
    try {
      backup = await db.importBackup.create({
        data: {
          runId: run.id,
          shop: run.shop,
          productId: plan.productId,
          cfsProductId: plan.cfsProductId,
          title: plan.title ?? "",
          data: {
            options: plan.current.options ?? null,
            workflow: plan.current.workflow ?? null,
            modelCards: plan.current.modelCards ?? null,
          },
        },
      });
    } catch {
      done.push({ ...entry, status: "failed", ready: false, message: BACKUP_FAILED, backupId: null });
      await record({});
      continue;
    }

    let result;
    try {
      result = await writeProduct({
        graphql,
        product: plan.product,
        current: plan.current,
        runId: run.id,
        sleep,
      });
    } catch (error) {
      // Unknown how far it got, so the backup stays.
      result = { ok: false, error: `Check this product: ${error.message}` };
    }

    if (result.ok) {
      done.push({
        ...entry,
        status: run.kind === "restore" ? "restored" : "imported",
        ready: result.ready,
        message: messageFor(run.kind, result),
        backupId: backup.id,
      });
      if (plan.restoreOfBackupId) {
        try {
          await db.importBackup.update({
            where: { id: plan.restoreOfBackupId },
            data: { restoredAt: new Date() },
          });
        } catch {
          // Only a note on the history page; the product is already restored.
        }
      }
    } else {
      // "Not changed" is certain, so its backup would only offer a restore to what is already there.
      const unchanged = result.error.startsWith("Not changed:");
      if (unchanged) {
        try {
          await db.importBackup.delete({ where: { id: backup.id } });
        } catch {
          // A harmless extra backup.
        }
      }
      done.push({
        ...entry,
        status: "failed",
        ready: false,
        message: result.error,
        backupId: unchanged ? null : backup.id,
      });
    }
    await record({});
  }
  await record({ status: "done" });
}

/**
 * Starts a restore of one backup. Returns { run, plan } (give both to runPlans) or { error }.
 * Nothing is written, and no run is left behind, when it is refused.
 */
export async function startRestore({ db, graphql, shop, backupId, createdBy = null, now }) {
  if (!writesAllowed(shop)) return { error: NOT_SWITCHED_ON };
  const backup = await db.importBackup.findUnique({ where: { id: backupId } });
  if (!backup || backup.shop !== shop) return { error: "That backup was not found" };
  if (backup.restoredAt) return { error: "This backup has already been restored" };
  const { options, workflow, modelCards } = backup.data ?? {};
  if (!Array.isArray(options)) {
    return {
      error: "This product had no options before that import, so there is nothing to restore",
    };
  }

  const live = await loadConfigurableProduct(graphql, backup.productId);
  if (!live) {
    return { error: "Shopify could not be read for this product just now; try again" };
  }
  const shared = await checkSharedOptions(graphql, options, {
    exceptProductIds: [backup.productId],
  });
  if (shared.errors.length) return { error: shared.errors.join("; ") };

  const started = await beginRun({
    db,
    shop,
    kind: "restore",
    createdBy,
    planned: [{ cfsProductId: backup.cfsProductId, title: backup.title }],
    now,
  });
  if (started.error) return { error: started.error };

  const rest = { ...live };
  for (const key of ["options", "modelCards", "workflow", "ordinary"]) delete rest[key];
  return {
    run: started.run,
    plan: {
      cfsProductId: backup.cfsProductId,
      productId: backup.productId,
      title: backup.title,
      current: live,
      product: { ...rest, options, workflow, modelCards },
      restoreOfBackupId: backup.id,
    },
  };
}

/** A run for the page. A stopped run's unfinished products are shown as needing a check. */
export function runView(run) {
  const { planned = [], done = [] } = run.results ?? {};
  const finished = new Set(done.map((d) => d.cfsProductId));
  const unfinished =
    run.status === "stopped"
      ? planned
          .filter((p) => !finished.has(p.cfsProductId))
          .map((p) => ({ ...p, status: "stopped", message: STOPPED }))
      : [];
  return { ...run, results: [...done, ...unfinished] };
}
