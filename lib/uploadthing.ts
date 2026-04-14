import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { auth } from './auth';

const f = createUploadthing();

export const ourFileRouter = {
  pdfUploader: f({
    pdf: { maxFileSize: '16MB', maxFileCount: 2 },
  })
    .middleware(async () => {
      const session = await auth();
      const role = (session?.user as { role?: string } | undefined)?.role;
      if (!session || (role !== 'tutor' && role !== 'admin')) {
        throw new Error('Unauthorized');
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, userId: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
