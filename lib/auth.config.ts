import type { NextAuthConfig } from 'next-auth';

export const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;
export const SESSION_MAX_AGE  =  1 * 24 * 60 * 60;

export const authConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.rememberMe = user.rememberMe ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: REMEMBER_MAX_AGE },
  trustHost: true,
} satisfies NextAuthConfig;
