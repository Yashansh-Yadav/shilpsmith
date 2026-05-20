import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "./prisma";
import { z } from "zod";
import { emailSchema } from "./validators";
import { logger } from "./logger";

// Loose login schema for NextAuth credentials: don't use .strict() because
// NextAuth merges its own fields (csrfToken, callbackUrl, json) into credentials.
const CredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          // Generic message: don't leak which field failed.
          throw new Error("Invalid email or password");
        }

        const admin = await prisma.admin.findUnique({
          where: { email: parsed.data.email },
        });

        // Constant-time-ish: still hash a dummy when admin is missing to
        // avoid an obvious timing distinction between "user not found" and
        // "wrong password".
        const hash = admin?.password ?? "$2a$10$invalidinvalidinvalidinvali";
        const ok = await bcrypt.compare(parsed.data.password, hash);

        if (!admin || !ok) {
          logger.warn("Failed admin login attempt", { email: parsed.data.email });
          throw new Error("Invalid email or password");
        }

        return {
          id: String(admin.id),
          email: admin.email,
          name: admin.name ?? null,
          role: admin.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours
  },

  pages: {
    signIn: "/admin-login",
    error: "/admin-login",
  },

  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? token.email;
        token.role = (user as { role?: string }).role ?? "ADMIN";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? null;
        session.user.role = (token.role as string) ?? "ADMIN";
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
