// Whether a product built from a sheet is exactly what the store already has, so importing it
// would change nothing.
import { isDeepStrictEqual } from "node:util";

const comparable = (option) => ({
  cfsId: option.cfsId,
  label: option.label,
  groupName: option.groupName,
  imageUrl: option.imageUrl || null,
  optionCode: option.optionCode || "",
  mappings: option.mappings,
});

/** current: from loadConfigurableProduct. built: from buildProduct. Choice order counts. */
export function sameProduct(current, built) {
  const currentOptions = current.options ?? [];
  return (
    isDeepStrictEqual(current.workflow, built.workflow) &&
    isDeepStrictEqual(current.modelCards, built.modelCards) &&
    currentOptions.length === built.options.length &&
    currentOptions.every((option, i) =>
      isDeepStrictEqual(comparable(option), comparable(built.options[i])),
    )
  );
}
