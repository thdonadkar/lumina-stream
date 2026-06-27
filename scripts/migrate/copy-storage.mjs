#!/usr/bin/env node
/**
 * copy-storage.mjs — copy every object from the source Supabase project's
 * buckets into the target project's buckets. Idempotent: skips files that
 * already exist on the target.
 *
 * Required env:
 *   SRC_URL, SRC_SERVICE_KEY  — source (Lovable Cloud) project
 *   DST_URL, DST_SERVICE_KEY  — your own Supabase project
 *
 * Usage:
 *   node scripts/migrate/copy-storage.mjs
 *
 * Buckets to copy are hard-coded to match this project. Add more as needed.
 */
import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["product-images", "return-photos", "support-attachments"];
const PAGE = 1000;

const { SRC_URL, SRC_SERVICE_KEY, DST_URL, DST_SERVICE_KEY } = process.env;
for (const [k, v] of Object.entries({ SRC_URL, SRC_SERVICE_KEY, DST_URL, DST_SERVICE_KEY })) {
  if (!v) { console.error(`Missing env ${k}`); process.exit(1); }
}

const src = createClient(SRC_URL, SRC_SERVICE_KEY, { auth: { persistSession: false } });
const dst = createClient(DST_URL, DST_SERVICE_KEY, { auth: { persistSession: false } });

async function listAll(client, bucket, prefix = "") {
  const out = [];
  let offset = 0;
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: PAGE, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // folder
        const nested = await listAll(client, bucket, path);
        out.push(...nested);
      } else {
        out.push(path);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function copyBucket(bucket) {
  console.log(`\n=== ${bucket} ===`);
  // Ensure the bucket exists on target (created by migration normally).
  const { data: dstBuckets } = await dst.storage.listBuckets();
  if (!dstBuckets?.find((b) => b.name === bucket)) {
    console.log(`creating bucket on target: ${bucket}`);
    await dst.storage.createBucket(bucket, { public: false });
  }

  const paths = await listAll(src, bucket);
  console.log(`source has ${paths.length} object(s)`);

  let copied = 0, skipped = 0, failed = 0;
  for (const path of paths) {
    // Skip if exists on target
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const name = path.slice(dir.length ? dir.length + 1 : 0);
    const { data: existing } = await dst.storage.from(bucket).list(dir, { search: name, limit: 1 });
    if (existing?.some((e) => e.name === name)) { skipped++; continue; }

    const { data: blob, error: dErr } = await src.storage.from(bucket).download(path);
    if (dErr) { console.error(`  download ${path}: ${dErr.message}`); failed++; continue; }

    const { error: uErr } = await dst.storage.from(bucket).upload(path, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });
    if (uErr) { console.error(`  upload ${path}: ${uErr.message}`); failed++; continue; }

    copied++;
    if (copied % 25 === 0) console.log(`  copied ${copied}/${paths.length}`);
  }
  console.log(`done: copied=${copied} skipped=${skipped} failed=${failed}`);
}

for (const b of BUCKETS) {
  try { await copyBucket(b); }
  catch (e) { console.error(`bucket ${b} failed:`, e.message); }
}
console.log("\nAll buckets processed.");
