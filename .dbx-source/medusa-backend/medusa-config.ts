import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const DATABASE_URL = process.env.DATABASE_URL
const REDIS_URL = process.env.REDIS_URL
const STORE_CORS = process.env.STORE_CORS || "http://localhost:3000"
const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:7000"
const AUTH_CORS = process.env.AUTH_CORS || "http://localhost:3000,http://localhost:7000"
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"
const COOKIE_SECRET = process.env.COOKIE_SECRET || "supersecret"

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

export default defineConfig({
  projectConfig: {
    databaseUrl: DATABASE_URL,
    http: {
      storeCors: STORE_CORS,
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET,
    },
  },

  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true" ? true : false,
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