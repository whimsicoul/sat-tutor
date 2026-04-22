import { DefaultSession } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    role: 'student' | 'tutor' | 'admin';
    rememberMe?: boolean;
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: 'student' | 'tutor' | 'admin';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'student' | 'tutor' | 'admin';
    rememberMe: boolean;
  }
}
