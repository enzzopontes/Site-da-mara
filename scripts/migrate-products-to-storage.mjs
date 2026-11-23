#!/usr/bin/env node
/**
 * Migrate local product images from `public/products/` to Supabase Storage
 * bucket `Products` and update matching `products.image_url` rows in Postgres.
 *
 * Dry-run by default:
 *   node scripts/migrate-products-to-storage.mjs
 *
 * Apply uploads and DB updates:
 *   node scripts/migrate-products-to-storage.mjs --apply
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT_DIR, "public", "products");
const ENV_LOCAL_PATH = path.join(ROOT_DIR, ".env.local");
const BUCKET = "Products";
const CACHE_CONTROL = "31536000";

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function loadEnvLocal(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIndex = cleaned.indexOf("=");
    if (eqIndex === -1) continue;

    const key = cleaned.slice(0, eqIndex).trim();
    let value = cleaned.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) vars[key] = value;
  }

  return vars;
}

function getEnv(envLocal) {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseUrl = rawUrl.replace(/\/+$/, "");
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY || "";

  return { supabaseUrl, serviceRoleKey };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function scanLocalImages(dirPath) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  const ignored = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const name = entry.name;
    if (name.startsWith(".")) {
      ignored.push(name);
      continue;
    }

    const ext = path.extname(name).toLowerCase();
    const contentType = MIME_TYPES[ext];
    if (!contentType) {
      ignored.push(name);
      continue;
    }

    const fullPath = path.join(dirPath, name);
    const stat = fs.statSync(fullPath);

    files.push({
      filename: name,
      fullPath,
      size: stat.size,
      contentType,
      localUrl: `/products/${name}`,
    });
  }

  files.sort((a, b) => a.filename.localeCompare(b.filename));
  return { files, ignored };
}

function buildPublicUrl(supabaseUrl, filename) {
  const base = supabaseUrl || "<NEXT_PUBLIC_SUPABASE_URL>";
  return `${base}/storage/v1/object/public/${BUCKET}/${filename}`;
}

async function fetchMatchingProducts(supabase, localUrls) {
  if (localUrls.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id, name, image_url")
    .in("image_url", localUrls);

  if (error) {
    throw new Error(`Failed to query products table: ${error.message}`);
  }

  return data || [];
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const mode = apply ? "APPLY" : "DRY-RUN";

  const envLocal = loadEnvLocal(ENV_LOCAL_PATH);
  const { supabaseUrl, serviceRoleKey } = getEnv(envLocal);
  const hasCredentials = Boolean(supabaseUrl && serviceRoleKey);

  console.log(`[migrate-products-to-storage] Mode: ${mode}`);
  console.log(`Source directory: ${PRODUCTS_DIR}`);
  console.log(`Target bucket: ${BUCKET}`);

  if (apply && !hasCredentials) {
    console.error(
      "Error: --apply requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in process.env or .env.local)."
    );
    process.exit(1);
  }

  const { files, ignored } = scanLocalImages(PRODUCTS_DIR);
  console.log(
    `Found ${files.length} valid image file(s)` +
      (ignored.length > 0 ? ` (ignored ${ignored.length}: ${ignored.join(", ")})` : "")
  );

  if (files.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  const supabase = hasCredentials
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const localUrlSet = new Set(files.map((f) => f.localUrl));
  let matchingRows = [];

  if (supabase) {
    try {
      matchingRows = await fetchMatchingProducts(supabase, Array.from(localUrlSet));
    } catch (err) {
      console.error(`Warning: ${err.message}`);
      if (apply) process.exit(1);
    }
  } else {
    console.log(
      "Credentials not found; skipping Postgres `products` table inspection."
    );
  }

  const rowsByLocalUrl = new Map();
  for (const row of matchingRows) {
    const list = rowsByLocalUrl.get(row.image_url) || [];
    list.push(row);
    rowsByLocalUrl.set(row.image_url, list);
  }

  if (!apply) {
    console.log("\nPlanned uploads:");
    for (const file of files) {
      const publicUrl = buildPublicUrl(supabaseUrl, file.filename);
      console.log(
        `  - ${file.filename} (${formatBytes(file.size)}, ${file.contentType}) -> ${BUCKET}/${file.filename}`
      );
      console.log(`    public URL: ${publicUrl}`);
    }

    if (supabase) {
      console.log(`\nPlanned DB updates (${matchingRows.length} matching row(s)):`);
      if (matchingRows.length === 0) {
        console.log("  (none)");
      } else {
        for (const row of matchingRows) {
          const filename = row.image_url.slice("/products/".length);
          const publicUrl = buildPublicUrl(supabaseUrl, filename);
          console.log(
            `  - product id=${row.id}${row.name ? ` (${row.name})` : ""}: ${row.image_url} -> ${publicUrl}`
          );
        }
      }
    }

    console.log("\nDry-run complete. Re-run with --apply to upload files and update rows.");
    return;
  }

  let uploaded = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const publicUrl = buildPublicUrl(supabaseUrl, file.filename);

    try {
      const buffer = fs.readFileSync(file.fullPath);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(file.filename, buffer, {
          contentType: file.contentType,
          cacheControl: CACHE_CONTROL,
          upsert: true,
        });

      if (uploadError) {
        errors += 1;
        console.error(
          `[ERROR] Upload failed for ${file.filename}: ${uploadError.message}`
        );
        continue;
      }

      uploaded += 1;
      console.log(`[UPLOADED] ${file.filename} -> ${publicUrl}`);
    } catch (err) {
      errors += 1;
      console.error(
        `[ERROR] Upload exception for ${file.filename}: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }

    const rowsForFile = rowsByLocalUrl.get(file.localUrl) || [];
    if (rowsForFile.length === 0) {
      skipped += 1;
      continue;
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("products")
      .update({ image_url: publicUrl })
      .eq("image_url", file.localUrl)
      .select("id");

    if (updateError) {
      errors += 1;
      console.error(
        `[ERROR] DB update failed for ${file.localUrl}: ${updateError.message}`
      );
      continue;
    }

    const count = updatedRows ? updatedRows.length : 0;
    updated += count;
    console.log(`[DB UPDATED] ${count} row(s): ${file.localUrl} -> ${publicUrl}`);
  }

  console.log("\nSummary:");
  console.log(`  uploaded: ${uploaded}`);
  console.log(`  updated:  ${updated}`);
  console.log(`  skipped:  ${skipped}`);
  console.log(`  errors:   ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
