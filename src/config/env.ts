import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.development') })

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  PERPLEXITY_API_KEY: z.string().optional(),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  // Google API Configuration
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional(),
  // Gmail OAuth2 Configuration
  GMAIL_SENDER: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  // SMTP Configuration (alternative to OAuth2)
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  // JWT Configuration
  JWT_SECRET: z.string().optional(),
})

export const config = envSchema.parse(process.env)
