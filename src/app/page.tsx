import CloudStudio from '@/components/CloudStudio';
import { isOwner } from '@/lib/auth';
import { infrastructure } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <CloudStudio authenticated={await isOwner()} services={infrastructure} />;
}
