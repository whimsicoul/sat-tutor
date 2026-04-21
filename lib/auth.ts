import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { encode } from '@auth/core/jwt';
import { getUserByEmail } from './db';

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const SESSION_MAX_AGE  =  1 * 24 * 60 * 60; // 1 day

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await getUserByEmail(credentials.email as string);
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashed_password
        );
        if (!valid) return null;
        return {
          id: user.id as string,
          name: user.name as string,
          email: user.email as string,
          role: user.role as string,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, credentials, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      if (trigger === 'signIn' && credentials) {
        token.rememberMe = credentials.rememberMe === 'true';
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as { role?: string }).role = token.role as string;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: REMEMBER_MAX_AGE },
  jwt: {
    maxAge: REMEMBER_MAX_AGE,
    async encode(params) {
      const rememberMe = (params.token as { rememberMe?: boolean })?.rememberMe ?? false;
      return encode({ ...params, maxAge: rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE });
    },
  },
  trustHost: true,
});
