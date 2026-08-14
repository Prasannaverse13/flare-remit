/**
 * /r/[id] — shareable recipient view. No auth, no app install required.
 *
 * The sender shares this link with the recipient. The page reads the
 * transfer from the persistent server-side store and renders a clean
 * view: "You're receiving X XRP from Y" + live status + onchain proof.
 *
 * The page is server-rendered (Next.js App Router default) so it works
 * even if the recipient opens it on a fresh device. The status poll
 * happens client-side after hydration.
 */
import { RecipientClient } from './RecipientClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RecipientPage({ params }: { params: { id: string } }) {
  return <RecipientClient transferId={params.id} />;
}
