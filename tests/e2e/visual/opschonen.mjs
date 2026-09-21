// Haalt mislukte en dubbele verzoeken uit de HAR-opnames, zodat het afspelen
// alleen geslaagde antwoorden serveert. Draai dit na UPDATE_FIXTURES=1.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
for (const naam of readdirSync(dir).filter((f) => f.endsWith(".har"))) {
  const pad = join(dir, naam);
  const har = JSON.parse(readFileSync(pad, "utf8"));
  const gezien = new Set();
  const voor = har.log.entries.length;
  har.log.entries = har.log.entries.filter((e) => {
    const status = e.response?.status ?? -1;
    if (status < 200 || status >= 400) return false;
    const sleutel = `${e.request.method} ${e.request.url} ${e.request.postData?.text ?? ""}`;
    if (gezien.has(sleutel)) return false;
    gezien.add(sleutel);
    return true;
  });
  writeFileSync(pad, JSON.stringify(har, null, 2) + "\n");
  console.log(`${naam}: ${voor} → ${har.log.entries.length} verzoeken`);
}
