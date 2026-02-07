import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import TaskDetailClient from './client-page'; // Ensure this path matches where you saved the Client Component
// ❌ Removed unused 'useRouter' (It only works in Client Components)

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic';
export const dynamicParams = true; 

// 1. Static Params Generation (Optional for force-dynamic, but good for build validation)
export async function generateStaticParams() {
  try {
      const querySnapshot = await getDocs(collection(db, 'tasks'));
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
      }));
  } catch (error) {
      console.error("Error generating static params:", error);
      return [];
  }
}

// 2. The Server Page Wrapper
export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Correctly await params for Next.js 15+
  const { id } = await params;

  // Pass the ID to the client component which handles the Realtime listeners
  return <TaskDetailClient id={id} />;
}