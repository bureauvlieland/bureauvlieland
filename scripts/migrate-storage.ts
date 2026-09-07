/**
 * Kopieert alle storage-bestanden van het oude (Lovable Cloud) project naar het
 * nieuwe Supabase-project. De database-dump bevat de rijen in storage.objects,
 * maar niet de bestanden zelf; dit script haalt ze op uit het oude project en
 * zet ze met de service-role key in het nieuwe project.
 *
 * Lezen uit het oude project gaat als ingelogde admin via de gewone
 * storage-API (de RLS-policies geven admins leesrecht op alle buckets). De
 * lijst met buckets komt van de tijdelijke edge function storage-export
 * (mode=buckets); staat die er niet, dan worden de buckets van het nieuwe
 * project gebruikt (die zitten in de database-dump).
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
 * Na afloop vergelijkt het script per bucket wat het oude project laat zien
 * met de rijen in het nieuwe project (uit de dump): zo valt op als de admin
 * iets niet mag zien, of als er na de export nog bestanden bij zijn gekomen.
 *
 * Herhaalbaar: bestaande bestanden worden overschreven (upsert), dus een
 * tweede run na een mislukte eerste is veilig.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
interface FileEntry { path: string; mimetype: string | null; size: number | null }

const PAGE = 1000;

/** Loopt een bucket recursief door (de storage-API geeft per map één niveau). */
async function walk(client: SupabaseClient, bucket: string, prefix = ""): Promise<FileEntry[]> {
  const out: FileEntry[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: PAGE, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`lijst ${bucket}/${prefix}: ${error.message}`);
    for (const e of data ?? []) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) {
        out.push(...await walk(client, bucket, path));
      } else if (e.name !== ".emptyFolderPlaceholder") {
        const meta = (e.metadata ?? {}) as Record<string, unknown>;
        out.push({
          path,
          mimetype: (meta.mimetype as string | undefined) ?? null,
          size: (meta.size as number | undefined) ?? null,
        });
      }
    }
    if ((data ?? []).length < PAGE) break;
  }
  return out;
}

async function main() {
  const oldClient = createClient(OLD_URL, OLD_ANON_KEY, { auth: { persistSession: false } });
  const { data: session, error: loginErr } = await oldClient.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (loginErr || !session.session) throw new Error(`Inloggen op oud project mislukt: ${loginErr?.message}`);
  const token = session.session.access_token;

  const newClient = createClient(NEW_URL, NEW_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: existing, error: listErr } = await newClient.storage.listBuckets();
  if (listErr) throw new Error(`Buckets nieuw project: ${listErr.message}`);
  const existingIds = new Set((existing ?? []).map((b) => b.id));

  // Bucketlijst met instellingen: via storage-export als die er staat, anders
  // via de buckets die de dump al in het nieuwe project heeft gezet.
  let buckets: BucketInfo[];
  const r = await fetch(`${OLD_URL}/functions/v1/storage-export?mode=buckets`, {
    headers: { Authorization: `Bearer ${token}`, apikey: OLD_ANON_KEY },
  });
  if (r.ok) {
    buckets = ((await r.json()) as { buckets: BucketInfo[] }).buckets;
    console.log(`Buckets in oud project (via storage-export): ${buckets.map((b) => b.id).join(", ")}`);
  } else {
    buckets = (existing ?? []).map((b) => ({
      id: b.id, public: b.public,
      file_size_limit: (b.file_size_limit as number | null) ?? null,
      allowed_mime_types: b.allowed_mime_types ?? null,
    }));
    console.log(`storage-export niet bereikbaar (HTTP ${r.status}); buckets uit nieuw project: ${buckets.map((b) => b.id).join(", ")}`);
  }
  const todo = buckets.filter((b) =>
    onlyBucket ? b.id === onlyBucket : !b.id.startsWith("database_export_"),
  );

  let copied = 0, failed = 0, bytes = 0;
  const summary: string[] = [];
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

    const [oldFiles, newRows] = await Promise.all([
      walk(oldClient, bucket.id),
      existingIds.has(bucket.id) ? walk(newClient, bucket.id) : Promise.resolve([] as FileEntry[]),
    ]);
    const oldPaths = new Set(oldFiles.map((f) => f.path));
    const missingInOld = newRows.filter((f) => !oldPaths.has(f.path)).map((f) => f.path);
    const oldMB = oldFiles.reduce((s, f) => s + (f.size ?? 0), 0) / 1024 / 1024;
    summary.push(
      `${bucket.id.padEnd(32)} oud: ${String(oldFiles.length).padStart(4)} (${oldMB.toFixed(1).padStart(6)} MB)   rijen nieuw: ${String(newRows.length).padStart(4)}` +
      (missingInOld.length ? `   ⚠ ${missingInOld.length} rijen in nieuw zonder bestand in oud` : ""),
    );
    for (const p of missingInOld) console.warn(`[${bucket.id}] rij in nieuw project, maar niet zichtbaar in oud: ${p}`);
    if (dryRun) continue;

    for (const f of oldFiles) {
      try {
        const { data: blob, error: dlErr } = await oldClient.storage.from(bucket.id).download(f.path);
        if (dlErr || !blob) throw new Error(`download: ${dlErr?.message ?? "leeg"}`);
        const buf = Buffer.from(await blob.arrayBuffer());
        const { error } = await newClient.storage.from(bucket.id).upload(f.path, buf, {
          contentType: f.mimetype ?? "application/octet-stream",
          upsert: true,
        });
        if (error) throw new Error(error.message);
        copied++; bytes += buf.length;
        if (copied % 50 === 0) console.log(`  … ${copied} bestanden gekopieerd`);
      } catch (e) {
        failed++;
        console.warn(`[${bucket.id}] ${f.path}: ${(e as Error).message}`);
      }
    }
    console.log(`[${bucket.id}] ${oldFiles.length} bestanden verwerkt`);
  }

  console.log("\nTelling per bucket:");
  for (const line of summary) console.log("  " + line);
  if (dryRun) console.log("\nDry-run: niets gekopieerd.");
  else console.log(`\nKlaar: ${copied} gekopieerd (${(bytes / 1024 / 1024).toFixed(1)} MB), ${failed} mislukt.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
