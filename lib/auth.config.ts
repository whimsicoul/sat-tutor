import type { NextAuthConfig } from 'next-auth';

export const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;
export const SESSION_MAX_AGE  =  1 * 24 * 60 * 60;

export const authConfig = {
  providers: [],
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
  trustHost: true,
} satisfies NextAuthConfig;
