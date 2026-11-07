
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const bucket = supabase.storage.from("venue-photos");

// Existing venue photos and new preserved paths.
const photos = [
  {
    original:
      "985000b4-3213-48c6-80b2-328e1959e9d0/b10e2521-d3c2-4e6c-b079-b52cec70e64f.png",
    preserved:
      "985000b4-3213-48c6-80b2-328e1959e9d0/b10e2521-d3c2-4e6c-b079-b52cec70e64f-preserved.png",
  },
  {
    original:
      "279ec568-526a-437c-b837-7f19f00f177a/96e8a282-c3fc-44b7-91aa-4025d31e2e79.png",
    preserved:
      "279ec568-526a-437c-b837-7f19f00f177a/96e8a282-c3fc-44b7-91aa-4025d31e2e79-preserved.png",
  },
];

async function main() {
  // First verify both source files exist.
  for (const photo of photos) {
    const { data, error } = await bucket.download(
      photo.original
    );

    if (error || !data || data.size === 0) {
      throw new Error(
        `Cannot read original photo: ${photo.original}`
      );
    }
  }

  // Copy without deleting or changing the originals.
  for (const photo of photos) {
    const { error } = await bucket.copy(
      photo.original,
      photo.preserved
    );

    if (error) {
      throw new Error(
        `Copy failed for ${photo.original}: ${error.message}`
      );
    }

    const { data, error: checkError } =
      await bucket.download(photo.preserved);

    if (checkError || !data || data.size === 0) {
      throw new Error(
        `Unable to verify copied photo: ${photo.preserved}`
      );
    }

    console.log("Preserved:", photo.preserved);
    console.log("File size:", data.size, "bytes");
  }

  console.log("Both venue photo copies are ready.");
  console.log("Original photos remain unchanged.");
}

main().catch((error) => {
  console.error("Photo preservation failed:", error.message);
  process.exitCode = 1;
});
