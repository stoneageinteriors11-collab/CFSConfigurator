// Chosen products' current options as a sheet, downloaded from the Options import page. Read only.
import { authenticate } from "../shopify.server";
import { currentOptionsWorkbook } from "../import/current-options.server.js";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const ids = new URL(request.url).searchParams.get("ids") ?? "";
  const result = await currentOptionsWorkbook(admin.graphql, ids);
  if (result.errors)
    return Response.json({ errors: result.errors }, { status: 400 });
  return new Response(result.bytes, {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
};
