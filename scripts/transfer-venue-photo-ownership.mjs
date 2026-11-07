
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase configuration.");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const storage = supabase.storage.from("venue-photos");

const photos = [
  {
    venueId: "985000b4-3213-48c6-80b2-328e1959e9d0",
    original:
      "985000b4-3213-48c6-80b2-328e1959e9d0/b10e2521-d3c2-4e6c-b079-b52cec70e64f.png",
    preserved:
      "985000b4-3213-48c6-80b2-328e1959e9d0/b10e2521-d3c2-4e6c-b079-b52cec70e64f-preserved.png",
  },
  {
    venueId: "279ec568-526a-437c-b837-7f19f00f177a",
    original:
      "279ec568-526a-437c-b837-7f19f00f177a/96e8a282-c3fc-44b7-91aa-4025d31e2e79.png",
    preserved:
      "279ec568-526a-437c-b837-7f19f00f177a/96e8a282-c3fc-44b7-91aa-4025d31e2e79-preserved.png",
  },
];

async function readFile(path) {
  const { data, error } = await storage.download(path);

  if (error || !data) {
    throw new Error(`Cannot read: ${path}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

function checksum(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const prepared = [];

  // Verify all files and database references first.
  for (const photo of photos) {
    const { data: venue, error } = await supabase
      .from("venues")
      .select("photo_paths")
      .eq("id", photo.venueId)
      .single();

    if (
      error ||
      !venue?.photo_paths?.includes(photo.original)
    ) {
      throw new Error(
        `Original photo reference not found: ${photo.venueId}`
      );
    }

    const originalBytes = await readFile(photo.original);
    const preservedBytes = await readFile(photo.preserved);

    if (checksum(originalBytes) !== checksum(preservedBytes)) {
      throw new Error(
        `Original and preserved copies do not match: ${photo.venueId}`
      );
    }

    prepared.push({
      ...photo,
      originalBytes,
    });

    console.log("Verified:", photo.original);
  }

  if (!apply) {
    console.log("Preflight passed. No files were changed.");
    console.log("Run again with --apply to transfer ownership.");
    return;
  }

  for (const photo of prepared) {
    console.log("Processing:", photo.original);

    // Remove the user-owned original.
    const { error: removeError } =
      await storage.remove([photo.original]);

    if (removeError) {
      throw new Error(removeError.message);
    }

    // Re-create at exactly the same path.
    const { error: copyError } =
      await storage.copy(photo.preserved, photo.original);

    if (copyError) {
      console.error("Copy failed. Attempting recovery.");

      const { error: recoveryError } =
        await storage.upload(
          photo.original,
          photo.originalBytes,
          {
            contentType: "image/png",
            upsert: false,
          }
        );

      if (recoveryError) {
        throw new Error(
          `Recovery failed for ${photo.original}: ${recoveryError.message}`
        );
      }
    }

    const restoredBytes = await readFile(photo.original);

    if (
      checksum(restoredBytes) !==
      checksum(photo.originalBytes)
    ) {
      throw new Error(
        `Restored file failed verification: ${photo.original}`
      );
    }

    console.log("Restored and verified:", photo.original);
  }

  console.log("Ownership transfer operations completed.");
  console.log("Preserved backups remain available.");
  console.log("Verify owner_id in Supabase before deletion.");
}

main().catch((error) => {
  console.error("Transfer stopped:", error.message);
  process.exitCode = 1;
});
