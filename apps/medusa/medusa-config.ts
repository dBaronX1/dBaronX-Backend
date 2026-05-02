import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", __dirname)

const requiredEnv = ["DATABASE_URL", "JWT_SECRET", "COOKIE_SECRET"] as const

const missingEnv = requiredEnv.filter((name) => {
  const value = process.env[name]
  return !value || !value.trim()
})

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  )
}

const DATABASE_URL = process.env.DATABASE_URL as string
const REDIS_URL = process.env.REDIS_URL

const STORE_CORS = process.env.STORE_CORS || "http://localhost:3000"
const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:9000"
const AUTH_CORS =
  process.env.AUTH_CORS || "http://localhost:3000,http://localhost:9000"
const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const DISABLE_MEDUSA_ADMIN = process.env.DISABLE_MEDUSA_ADMIN === "true"

export default defineConfig({
  projectConfig: {
    databaseUrl: DATABASE_URL,
    http: {
      storeCors: STORE_CORS,
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
    },
  },
  admin: {
    disable: DISABLE_MEDUSA_ADMIN,
    backendUrl: MEDUSA_BACKEND_URL,
  },
  modules: REDIS_URL
    ? [
        {
          resolve: "@medusajs/medusa/cache-redis",
          options: {
            redisUrl: REDIS_URL,
          },
        },
        {
          resolve: "@medusajs/medusa/event-bus-redis",
          options: {
            redisUrl: REDIS_URL,
          },
        },
      ]
    : [],
})