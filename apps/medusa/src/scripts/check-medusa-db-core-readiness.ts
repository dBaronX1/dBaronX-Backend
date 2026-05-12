import { loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

type PgClient = {
  connect: () => Promise<void>
  end: () => Promise<void>
  query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<{ table_name: string }> }>
}

const requiredCoreTables = [
  "currency",
  "region",
  "region_country",
  "sales_channel",
  "product",
  "product_variant",
  "payment_provider",
  "tax_provider",
  "fulfillment_provider",
  "stock_location",
  "inventory_item",
  "inventory_level",
]

function fail(result: Record<string, unknown>): never {
  console.log(JSON.stringify(result, null, 2))
  process.exit(1)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    fail({
      success: false,
      blockers: ["DATABASE_URL_missing"],
      databaseReachable: false,
      missingTables: requiredCoreTables,
      existingTables: [],
      migrationLikelyRequired: true,
      nextManualStep: "Set DATABASE_URL in the Medusa runtime environment, then run pnpm --filter @dbaronx/medusa run db:prepare. Do not paste or log the URL.",
    })
  }

  const { Client } = require("pg") as {
    Client: new (options: { connectionString: string; ssl?: { rejectUnauthorized: boolean } }) => PgClient
  }

  const ssl = /sslmode=require|render\.com|oregon-postgres|singapore-postgres|frankfurt-postgres/i.test(databaseUrl)
    ? { rejectUnauthorized: false }
    : undefined
  const client = new Client({ connectionString: databaseUrl, ssl })

  try {
    await client.connect()
    const { rows } = await client.query(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[]) order by table_name`,
      [requiredCoreTables],
    )
    const existingTables = rows.map((row) => row.table_name)
    const missingTables = requiredCoreTables.filter((table) => !existingTables.includes(table))
    const success = missingTables.length === 0
    const result = {
      success,
      blockers: success ? [] : ["medusa_core_tables_missing"],
      databaseReachable: true,
      missingTables,
      existingTables,
      migrationLikelyRequired: !success,
      nextManualStep: success
        ? "Database schema is ready. Continue with shipping:ensure, commerce:ensure, then start Medusa."
        : "Run official Medusa migrations first: pnpm --filter @dbaronx/medusa run db:migrate, then rerun db:health. Do not hand-create Medusa core tables.",
    }
    console.log(JSON.stringify(result, null, 2))
    process.exit(success ? 0 : 1)
  } catch (error) {
    fail({
      success: false,
      blockers: ["database_unreachable_or_query_failed"],
      databaseReachable: false,
      missingTables: requiredCoreTables,
      existingTables: [],
      migrationLikelyRequired: true,
      nextManualStep: "Verify the new Render DATABASE_URL is set only in Render env and reachable by Medusa, then rerun db:prepare.",
      error: error instanceof Error ? error.message.replace(databaseUrl, "<redacted>") : String(error),
    })
  } finally {
    try {
      await client.end()
    } catch {}
  }
}

void main()
