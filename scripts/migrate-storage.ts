/**
 * Kopieert alle storage-bestanden van het oude (Lovable Cloud) project naar het
 * nieuwe Supabase-project. De database-dump bevat de rijen in storage.objects,
 * maar niet de bestanden zelf; dit script haalt ze op via de edge function
 * storage-export (oude project, admin-login) en zet ze met de service-role key
 * in het nieuwe project.
 *
 * Gebruik:
 *   OLD_URL=https://blhspuifehausilnzwio.supabase.co \
 *   OLD_ANON_KEY=... ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   NEW_URL=https://<nieuw>.supabase.co NEW_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/migrate-storage.ts [--bucket <id>] [--dry-run]
 *
 * Buckets die beginnen met "database_export_" zijn Lovable's eigen
 * exportbestanden en worden overgeslagen.
 *
 * Herhaalbaar: bestaande bestanden worden overschreven (upsert), dus een
 * tweede run na een mislukte eerste is veilig.
 */
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const onlyBucket = args.includes("--bucket") ? args[args.indexOf("--bucket") + 1] : null;
const dryRun = args.includes("--dry-run");

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Omgevingsvariabele ${name} ontbreekt`);
  return v;
}
const OLD_URL = need("OLD_URL").replace(/\/$/, "");
const OLD_ANON_KEY = need("OLD_ANON_KEY");
const ADMIN_EMAIL = need("ADMIN_EMAIL");
const ADMIN_PASSWORD = need("ADMIN_PASSWORD");
const NEW_URL = need("NEW_URL").replace(/\/$/, "");
const NEW_SERVICE_ROLE_KEY = need("NEW_SERVICE_ROLE_KEY");

interface BucketInfo { id: string; public: boolean; file_size_limit: number | null; allowed_mime_types: string[] | null }
interface ExportItem { name: string; mimetype: string | null; size: number | null; signedUrl: string | null; error: string | null }

async function main() {
  const oldClient = createClient(OLD_URL, OLD_ANON_KEY);
  const { data: session, error: loginErr } = await oldClient.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (loginErr || !session.session) throw new Error(`Inloggen op oud project mislukt: ${loginErr?.message}`);
  const token = session.session.access_token;

  async function exportGet<T>(query: string): Promise<T> {
    const r = await fetch(`${OLD_URL}/functions/v1/storage-export?${query}`, {
      headers: { Authorization: `Bearer ${token}`, apikey: OLD_ANON_KEY },
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`storage-export ${query}: HTTP ${r.status} ${JSON.stringify(body)}`);
    return body as T;
  }

  const newClient = createClient(NEW_URL, NEW_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: existing, error: listErr } = await newClient.storage.listBuckets();
  if (listErr) throw new Error(`Buckets nieuw project: ${listErr.message}`);
  const existingIds = new Set((existing ?? []).map((b) => b.id));

  const { buckets } = await exportGet<{ buckets: BucketInfo[] }>("mode=buckets");
  const todo = buckets.filter((b) =>
    onlyBucket ? b.id === onlyBucket : !b.id.startsWith("database_export_"),
  );
  console.log(`Buckets in oud project: ${buckets.map((b) => b.id).join(", ")}`);

  let copied = 0, failed = 0, bytes = 0;
  for (const bucket of todo) {
    if (!existingIds.has(bucket.id)) {
      console.log(`[${bucket.id}] bestaat nog niet in nieuw project → aanmaken (public=${bucket.public})`);
      if (!dryRun) {
        const { error } = await newClient.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.file_size_limit ?? undefined,
          allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
        });
        if (error) throw new Error(`Bucket ${bucket.id} aanmaken: ${error.message}`);
      }
    }
    let after = "";
    let count = 0;
    for (;;) {
      const page = await exportGet<{ items: ExportItem[]; next: string | null }>(
        `bucket=${encodeURIComponent(bucket.id)}&after=${encodeURIComponent(after)}`,
      );
      for (const item of page.items) {
        count++;
        if (!item.signedUrl) { console.warn(`[${bucket.id}] ${item.name}: geen downloadlink (${item.error})`); failed++; continue; }
        if (dryRun) continue;
        try {
          const dl = await fetch(item.signedUrl);
          if (!dl.ok) throw new Error(`download HTTP ${dl.status}`);
          const buf = Buffer.from(await dl.arrayBuffer());
          const { error } = await newClient.storage.from(bucket.id).upload(item.name, buf, {
            contentType: item.mimetype ?? "application/octet-stream",
            upsert: true,
          });
          if (error) throw new Error(error.message);
          copied++; bytes += buf.length;
          if (copied % 50 === 0) console.log(`  … ${copied} bestanden gekopieerd`);
        } catch (e) {
          failed++;
          console.warn(`[${bucket.id}] ${item.name}: ${(e as Error).message}`);
        }
      }
      if (!page.next) break;
      after = page.next;
    }
    console.log(`[${bucket.id}] ${count} bestanden${dryRun ? " (dry-run, niets gekopieerd)" : ""}`);
  }
  console.log(`\nKlaar: ${copied} gekopieerd (${(bytes / 1024 / 1024).toFixed(1)} MB), ${failed} mislukt.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
