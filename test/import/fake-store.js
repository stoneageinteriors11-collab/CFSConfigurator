// A fake Shopify that keeps option entries and products, applies the import's writes, and can
// fail them on purpose. Reads (product lookups) are served by fakeShop over the same products.
import { fakeShop } from "./fake-shop.js";

/**
 * products: fixture products, changed in place by writes. Each product's options get entry IDs
 * old-1, old-2, ... unless they have one.
 * Failures to inject:
 *   refuseCreateAt: the nth entry create is refused (1 is the first)
 *   refuseSwitch: the switch is refused
 *   switchThrows: "applied" or "lost": the switch's answer is never seen, with or without the change made
 *   unreadable: after a thrown switch, product reads fail
 *   deleteFails: Set of entry IDs whose delete is refused
 */
export function fakeStore(products, failures = {}) {
  const entries = new Map();
  let nextOld = 1;
  for (const product of products) {
    if (product.ordinary) continue;
    for (const option of product.options) {
      option.entryId ??= `gid://shopify/Metaobject/old-${nextOld++}`;
      entries.set(option.entryId, { ...option });
    }
  }
  const reads = fakeShop(products);
  const calls = { creates: 0, switches: 0, deletes: [] };
  let broken = false;
  let nextNew = 1;

  const answer = (data) => ({ json: async () => ({ data }) });

  async function graphql(query, { variables }) {
    if (query.includes("CfsCreateEntry")) {
      calls.creates += 1;
      if (failures.refuseCreateAt === calls.creates) {
        return answer({ metaobjectCreate: { metaobject: null, userErrors: [{ message: "Image url is invalid" }] } });
      }
      const { handle, fields } = variables.metaobject;
      const by = Object.fromEntries(fields.map((f) => [f.key, f.value]));
      const id = `gid://shopify/Metaobject/new-${nextNew++}`;
      entries.set(id, {
        entryId: id,
        handle,
        cfsId: by.cfs_id,
        label: by.label,
        groupName: by.group_name,
        mappings: JSON.parse(by.source_mappings),
        imageUrl: by.image_url ?? null,
        optionCode: by.option_code ?? "",
      });
      return answer({ metaobjectCreate: { metaobject: { id }, userErrors: [] } });
    }
    if (query.includes("CfsEntryByHandle")) {
      const found = [...entries.values()].find((e) => e.handle === variables.handle.handle);
      return answer({ metaobjectByHandle: found ? { id: found.entryId } : null });
    }
    if (query.includes("CfsSwitchProduct")) {
      calls.switches += 1;
      if (failures.refuseSwitch) {
        return answer({ metafieldsSet: { metafields: [], userErrors: [{ message: "Value is invalid" }] } });
      }
      if (failures.switchThrows !== "lost") {
        const product = products.find((p) => p.productId === variables.metafields[0].ownerId);
        const value = (key) => JSON.parse(variables.metafields.find((m) => m.key === key).value);
        product.options = value("options").map((id) => ({ ...entries.get(id) }));
        product.workflow = value("workflow");
        product.modelCards = value("model_cards");
      }
      if (failures.switchThrows) {
        broken = Boolean(failures.unreadable);
        throw new Error("socket hang up");
      }
      return answer({ metafieldsSet: { metafields: [{}, {}, {}], userErrors: [] } });
    }
    if (query.includes("CfsEntryListed")) {
      const listed = products.some((p) => !p.ordinary && p.options.some((o) => o.entryId === variables.id));
      return answer({
        metaobject: entries.has(variables.id)
          ? { referencedBy: { nodes: listed ? [{ referencer: { id: "x" } }] : [] } }
          : null,
      });
    }
    if (query.includes("CfsDeleteEntry")) {
      calls.deletes.push(variables.id);
      if (failures.deleteFails?.has(variables.id)) {
        return answer({ metaobjectDelete: { deletedId: null, userErrors: [{ message: "Cannot delete" }] } });
      }
      entries.delete(variables.id);
      return answer({ metaobjectDelete: { deletedId: variables.id, userErrors: [] } });
    }
    if (broken) throw new Error("Shopify is unreachable");
    return reads(query, { variables });
  }

  return { graphql, entries, calls };
}
