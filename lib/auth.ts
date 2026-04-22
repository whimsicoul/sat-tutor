import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { encode } from '@auth/core/jwt';
import { getUserByEmail } from './db';
import { authConfig, REMEMBER_MAX_AGE, SESSION_MAX_AGE } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
  jwt: {
    maxAge: REMEMBER_MAX_AGE,
    async encode(params) {
      const rememberMe = (params.token as { rememberMe?: boolean })?.rememberMe ?? false;
      return encode({ ...params, maxAge: rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE });
    },
  },
});
