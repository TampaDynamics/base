// app/protected/page.tsx
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@aws-amplify/adapter-nextjs';
import { cookies, headers } from 'next/headers';

export default async function ProtectedPage() {
  const session = await runWithAmplifyServerContext({
    nextServerContext: { cookies, headers },
    operation: async () => {
      try {
        return await fetchAuthSession();
      } catch (error) {
        return null;
      }
    },
  });

  const groups = session?.tokens?.idToken?.payload['cognito:groups'] || [];

  if (!groups.includes('admin')) {
    return <div>Access Denied: Admins Only</div>;
  }

  return <div>Welcome, Admin! This is protected content.</div>;
}