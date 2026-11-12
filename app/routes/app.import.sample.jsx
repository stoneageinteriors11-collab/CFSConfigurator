// The sample option sheet, downloaded from the Options import page.
import { authenticate } from "../shopify.server";
import { sampleWorkbook } from "../import/spreadsheet.server.js";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return new Response(await sampleWorkbook(), {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": 'attachment; filename="cfs-options-sample.xlsx"',
      "Cache-Control": "no-store",
    },
  });
};
