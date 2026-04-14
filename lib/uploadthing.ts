import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { auth } from './auth';

const f = createUploadthing();

export const ourFileRouter = {
  pdfUploader: f({
    pdf: { maxFileSize: '16MB', maxFileCount: 2 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session || (session.user as { role?: string }).role !== 'tutor') {
        throw new Error('Unauthorized');
      }
      return { tutorId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, tutorId: metadata.tutorId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
