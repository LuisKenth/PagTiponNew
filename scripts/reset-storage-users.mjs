import { createClient } from "@supabase/supabase-js";

const expectedProject = "lggmkirpvtrudsytywed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase URL or service role key in .env.local.");
}

if (new URL(url).hostname !== `${expectedProject}.supabase.co`) {
  throw new Error("Reset stopped: the Supabase project does not match PagTipon.");
}

const admin = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function run() {
  // Confirm step 1 completed before deleting files or accounts.
  const tables = [
    "certificates",
    "staff_email_deliveries",
    "email_notification_deliveries",
    "event_email_deliveries",
    "event_certificate_signatories",
    "event_memos",
    "reports",
    "event_staff_assignments",
    "attendance",
    "rsvps",
    "notifications",
    "participant_verifications",
    "proof_cleanup_queue",
    "event_municipalities",
    "events",
    "venues",
  ];

  for (const table of tables) {
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) throw new Error(`${table}: ${error.message}`);

    if (count !== 0) {
      throw new Error(
        `Reset stopped: ${table} is not empty. Complete the SQL step first.`
      );
    }
  }

  const {
    data: provincialAdmins,
    count: provincialCount,
    error: profileError,
  } = await admin
    .from("profiles")
    .select("id, verification_status", { count: "exact" })
    .eq("role", "provincial_admin");

  if (profileError) throw new Error(profileError.message);

  if (
    !provincialAdmins?.length ||
    provincialCount !== provincialAdmins.length ||
    !provincialAdmins.some(
      (profile) => profile.verification_status === "approved"
    )
  ) {
    throw new Error("Reset stopped: unable to verify Provincial Admin accounts.");
  }

  const keepIds = new Set(provincialAdmins.map((profile) => profile.id));

  // Collect every page before deleting so pagination does not skip users.
  const users = [];

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw new Error(error.message);

    users.push(...data.users);

    if (data.users.length < 100) break;
  }

  const authIds = new Set(users.map((user) => user.id));

  for (const id of keepIds) {
    if (!authIds.has(id)) {
      throw new Error(
        "Reset stopped: a Provincial Admin profile has no Auth account."
      );
    }
  }

  // Stop rather than delete an inconsistent Provincial Admin account.
  for (const user of users) {
    if (
      user.app_metadata?.provisioned_role === "provincial_admin" &&
      !keepIds.has(user.id)
    ) {
      throw new Error(
        "Reset stopped: Provincial Admin metadata and profile do not match."
      );
    }
  }

  console.log(`Keeping ${keepIds.size} Provincial Admin account(s).`);

  // Empty all project Storage buckets, retaining the buckets themselves.
  const { data: buckets, error: bucketError } =
    await admin.storage.listBuckets();

  if (bucketError) throw new Error(bucketError.message);

  for (const bucket of buckets ?? []) {
    const { error } = await admin.storage.emptyBucket(bucket.id);

    if (error) {
      throw new Error(`Storage ${bucket.id}: ${error.message}`);
    }

    console.log(`Emptied Storage bucket: ${bucket.id}`);
  }

  let deleted = 0;

  for (const user of users) {
    if (keepIds.has(user.id)) continue;

    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      throw new Error(`Account deletion failed: ${error.message}`);
    }

    deleted++;
  }

  // The Auth deletion cascades to profiles in your schema.
  const { count: remaining, error: remainingError } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .neq("role", "provincial_admin");

  if (remainingError) throw new Error(remainingError.message);

  if (remaining !== 0) {
    throw new Error(
      "Some non-Provincial Admin profiles remain. Send this message for checking."
    );
  }

  console.log(`Deleted ${deleted} non-Provincial Admin Auth account(s).`);
  console.log("Reset completed. Provincial Admin accounts were preserved.");
}

run().catch((error) => {
  console.error("Reset stopped:", error.message);
  process.exitCode = 1;
});