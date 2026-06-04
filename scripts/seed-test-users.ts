import { createClient } from "@supabase/supabase-js";

type TestUser = {
  email: string;
  password: string;
  role: "super_owner" | "agency" | "client";
  fullName: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const users: TestUser[] = [
  {
    email: process.env.SEED_SUPER_OWNER_EMAIL?.trim() || "owner123@test.com",
    password: requiredEnv("SEED_SUPER_OWNER_PASSWORD"),
    role: "super_owner",
    fullName: "Super Owner",
  },
  {
    email: process.env.SEED_AGENCY_EMAIL?.trim() || "agency123@test.com",
    password: requiredEnv("SEED_AGENCY_PASSWORD"),
    role: "agency",
    fullName: "Test Agency",
  },
  {
    email: process.env.SEED_CLIENT_EMAIL?.trim() || "client123@test.com",
    password: requiredEnv("SEED_CLIENT_PASSWORD"),
    role: "client",
    fullName: "Test Client",
  },
];

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const matchedUser = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (matchedUser) return matchedUser;

    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function tableExists(tableName: "users" | "profiles") {
  const { error } = await supabase.from(tableName).select("id").limit(1);
  return !error;
}

async function upsertPublicIdentity(userId: string, testUser: TestUser) {
  const { error: rpcError } = await supabase.rpc("sync_identity_role", {
    target_user_id: userId,
    target_email: testUser.email,
    target_role: testUser.role,
    target_agency_id: null,
  });

  if (!rpcError) return;

  const [hasUsersTable, hasProfilesTable] = await Promise.all([tableExists("users"), tableExists("profiles")]);

  if (!hasUsersTable && !hasProfilesTable) {
    throw new Error("Neither public.users nor public.profiles exists. Run the owner dashboard migration first.");
  }

  if (hasUsersTable) {
    const { error } = await supabase.from("users").upsert(
      {
        id: userId,
        email: testUser.email,
        role: testUser.role,
        agency_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) throw error;
  }

  if (hasProfilesTable) {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: testUser.email,
        full_name: testUser.fullName,
        role: testUser.role,
        agency_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) throw error;
  }
}

async function ensureAuthUser(testUser: TestUser) {
  const existingUser = await findAuthUserByEmail(testUser.email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
      user_metadata: {
        role: testUser.role,
        full_name: testUser.fullName,
      },
    });

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: testUser.email,
    password: testUser.password,
    email_confirm: true,
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {
      role: testUser.role,
      full_name: testUser.fullName,
    },
  });

  if (error) throw error;
  return data.user;
}

async function main() {
  for (const testUser of users) {
    const authUser = await ensureAuthUser(testUser);
    await upsertPublicIdentity(authUser.id, testUser);
  }

  console.log("\nDevelopment test users are ready:\n");
  for (const testUser of users) {
    console.log(`${testUser.fullName}`);
    console.log(`  Email: ${testUser.email}`);
    console.log("  Password: [provided via environment]");
    console.log(`  Role: ${testUser.role}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
