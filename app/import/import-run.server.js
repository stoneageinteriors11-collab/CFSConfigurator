// Option import runs: who may write, one run at a time, a backup before each product is
// changed, a result per product, and Restore (which is a run that writes a backup back).
import { isDeepStrictEqual } from "node:util";
import { loadConfigurableProduct } from "../pricing/load-product.server.js";
import { checkSharedOptions, warmSharedOptions } from "./shared-options.server.js";
import { writeProduct } from "./write-product.server.js";

// A run not updated for this long is taken to have died with its server.
const STALE_AFTER_MS = 10 * 60 * 1000;

const NOT_SWITCHED_ON = "Importing is not switched on for this store";
const ALREADY_RUNNING =
  "Another import is running for this store; wait for it to finish";
const BACKUP_FAILED = "Not changed: the backup could not be saved";
const STOPPED = "Stopped part-way; check this product";
const CANNOT_READ = "Not changed: Shopify could not be read for this product just now";

// How often a running import tells the database it is alive. Well inside STALE_AFTER_MS.
const HEARTBEAT_MS = 30 * 1000;

const optionKey = (o) => ({
  entryId: o.entryId,
  cfsId: o.cfsId,
  label: o.label,
  groupName: o.groupName,
  imageUrl: o.imageUrl ?? null,
  optionCode: o.optionCode || "",
  mappings: o.mappings,
});

/** Whether a product is still exactly as it was when it was checked (its options, costs and sizes). */
export function unchangedSince(checked, live) {
  const shape = (p) => ({
    options: (p.options ?? []).map(optionKey),
    workflow: p.workflow,
    modelCards: p.modelCards,
    optionCosts: p.optionCosts ?? {},
    variants: (p.variants ?? []).map((v) => [v.id, v.sku]),
  });
  return isDeepStrictEqual(shape(checked), shape(live));
}

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
  createdByName = null,
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
        createdByName,
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
export async function runPlans({ db, graphql, run, plans, sleep, heartbeatMs = HEARTBEAT_MS }) {
  const { planned } = run.results;
  const done = [];
  const record = (data) =>
    db.importRun.update({
      where: { id: run.id },
      data: { ...data, results: { planned, done } },
    });
  // A long product can take many minutes, so the run says it is alive as it goes. Without this a
  // second import could take over a run that is still writing.
  let lastBeat = Date.now();
  const tick = async () => {
    if (Date.now() - lastBeat < heartbeatMs) return;
    lastBeat = Date.now();
    try {
      await record({});
    } catch {
      // a missed beat is harmless; the next one tries again
    }
  };

  for (const plan of plans) {
    const entry = {
      cfsProductId: plan.cfsProductId,
      productId: plan.productId,
      title: plan.title,
    };
    // The product is read again now, right before it is written: the check may be minutes old,
    // and anyone may have edited it in Shopify since. The backup and the entries replaced come
    // from this fresh read, so Restore never puts back something that was not there.
    let live = null;
    try {
      live = await loadConfigurableProduct(graphql, plan.productId);
    } catch {
      live = null;
    }
    if (!live || live.ordinary) {
      done.push({ ...entry, status: "failed", ready: false, message: CANNOT_READ, backupId: null });
      await record({});
      continue;
    }
    if (!unchangedSince(plan.current, live)) {
      const again = run.kind === "restore" ? "try the restore again" : "preview the sheet again";
      done.push({
        ...entry,
        status: "failed",
        ready: false,
        message: `Not changed: this product was changed in Shopify after it was checked; ${again}`,
        backupId: null,
      });
      await record({});
      continue;
    }

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
            options: live.options ?? null,
            workflow: live.workflow ?? null,
            modelCards: live.modelCards ?? null,
            optionCosts: live.optionCosts ?? {},
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
        current: live,
        runId: run.id,
        sleep,
        tick,
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
  // Only a run that is still running may finish: one already taken over as stopped stays stopped.
  await db.importRun.updateMany({
    where: { id: run.id, status: "running" },
    data: { status: "done", results: { planned, done } },
  });
}

/** Marks a run stopped if it is still running, so a failure is visible and the shop can import again. */
export const stopRun = (db, runId) =>
  db.importRun.updateMany({ where: { id: runId, status: "running" }, data: { status: "stopped" } });

/** Whether a backup holds a product's options (one taken before its first import does not). */
export const hasOptionsToRestore = (data) => Array.isArray(data?.options);

/**
 * Starts a restore of one backup. Returns { run, plan } (give both to runPlans) or { error }.
 * Nothing is written, and no run is left behind, when it is refused.
 */
export async function startRestore({ db, graphql, shop, backupId, createdBy = null, createdByName = null, now }) {
  if (!writesAllowed(shop)) return { error: NOT_SWITCHED_ON };
  const backup = await db.importBackup.findUnique({ where: { id: backupId } });
  if (!backup || backup.shop !== shop) return { error: "That backup was not found" };
  if (backup.restoredAt) return { error: "This backup has already been restored" };
  const { options, workflow, modelCards } = backup.data ?? {};
  if (!hasOptionsToRestore(backup.data)) {
    return {
      error: "This product had no options before that import, so there is nothing to restore",
    };
  }

  const live = await loadConfigurableProduct(graphql, backup.productId);
  if (!live) {
    return { error: "Shopify could not be read for this product just now; try again" };
  }
  const cache = new Map();
  await warmSharedOptions(graphql, [options], { cache });
  const shared = await checkSharedOptions(graphql, options, {
    exceptProductIds: [backup.productId],
    cache,
  });
  if (shared.errors.length) return { error: shared.errors.join("; ") };

  const started = await beginRun({
    db,
    shop,
    kind: "restore",
    createdBy,
    createdByName,
    planned: [{ cfsProductId: backup.cfsProductId, title: backup.title }],
    now,
  });
  if (started.error) return { error: started.error };

  const rest = { ...live };
  for (const key of ["options", "modelCards", "workflow", "ordinary", "optionCosts"]) delete rest[key];
  // A backup taken before costs existed holds none, so the costs now on the product stay for the
  // choices that come back; a newer backup puts back exactly the costs it saved.
  const optionCosts =
    backup.data && "optionCosts" in backup.data
      ? (backup.data.optionCosts ?? {})
      : Object.fromEntries(
          Object.entries(live.optionCosts ?? {}).filter(([cfsId]) =>
            options.some((o) => o.cfsId === cfsId),
          ),
        );
  return {
    run: started.run,
    plan: {
      cfsProductId: backup.cfsProductId,
      productId: backup.productId,
      title: backup.title,
      current: live,
      product: { ...rest, options, workflow, modelCards, optionCosts },
      restoreOfBackupId: backup.id,
    },
  };
}

/**
 * A run for the page. A run that has not moved for 10 minutes is shown as stopped, and a stopped
 * run's unfinished products are shown as needing a check.
 */
export function runView(run, now = new Date()) {
  const { planned = [], done = [] } = run.results ?? {};
  const stale =
    run.status === "running" &&
    run.updatedAt &&
    now.getTime() - new Date(run.updatedAt).getTime() > STALE_AFTER_MS;
  const status = stale ? "stopped" : run.status;
  const finished = new Set(done.map((d) => d.cfsProductId));
  const unfinished =
    status === "stopped"
      ? planned
          .filter((p) => !finished.has(p.cfsProductId))
          .map((p) => ({ ...p, status: "stopped", message: STOPPED }))
      : [];
  return { ...run, status, results: [...done, ...unfinished] };
}

/**
 * A run's results for the history page, each with the backup that can put the product back
 * (backupId) and whether Restore is offered (restorable). Restore is offered for a product that
 * was written, and also for one that may have been: a stopped run's unfinished product, or one
 * marked "Check this product". run.backups: { id, cfsProductId, restoredAt, data }.
 */
export function withRestorable(run, view = runView(run)) {
  const backups = run.backups ?? [];
  const open = new Set(
    backups.filter((b) => !b.restoredAt && hasOptionsToRestore(b.data)).map((b) => b.id),
  );
  const byProduct = new Map(backups.map((b) => [b.cfsProductId, b.id]));
  return view.results.map((r) => {
    const mayHaveChanged =
      r.status === "stopped" ||
      (r.status === "failed" && r.message?.startsWith("Check this product"));
    const written = r.status === "imported" || r.status === "restored";
    const backupId = r.backupId ?? (mayHaveChanged ? byProduct.get(r.cfsProductId) : undefined);
    return { ...r, backupId, restorable: (written || mayHaveChanged) && open.has(backupId) };
  });
}
