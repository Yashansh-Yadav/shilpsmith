import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";

import { prisma } from "./prisma";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",

      credentials: {
        email: {},

        password: {}
      },

      async authorize(credentials: any) {
        if (
          !credentials?.email ||
          !credentials?.password
        ) {
          return null;
        }

        const user =
          await prisma.admin.findUnique({
            where: {
              email:
                credentials.email
            }
          });

        if (!user) {
          throw new Error(
            "User not found"
          );
        }

        const valid =
          await bcrypt.compare(
            credentials.password,
            user.password
          );

        if (!valid) {
          throw new Error(
            "Invalid password"
          );
        }

        return {
          id: String(user.id),
          email: user.email
        };
      }
    })
  ],

  session: {
    strategy: "jwt"
  },

  secret:
    process.env.NEXTAUTH_SECRET
};