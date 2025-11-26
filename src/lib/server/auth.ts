import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const createAuth = (env: any) => betterAuth({
    database: drizzleAdapter(drizzle(env.DB), {
        provider: "sqlite",
        schema: schema
    }),
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
        }
    },
    secret: env.BETTER_AUTH_SECRET
});
