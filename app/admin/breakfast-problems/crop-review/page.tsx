import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBreakfastProblemsForCropReview } from '@/lib/db';
import CropReviewClient from './client';

export interface CropProblem {
  id: string;
  question_image_url: string;
  crop_top_px: number;
  crop_bottom_px: number;
  image_width_px: number;
  image_height_px: number;
}

export default async function CropReviewPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const problems = await getBreakfastProblemsForCropReview();

  return (
    <CropReviewClient problems={problems as unknown as CropProblem[]} />
  );
}
