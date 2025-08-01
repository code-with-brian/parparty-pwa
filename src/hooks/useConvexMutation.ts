import { useMutation } from 'convex/react';
import type { FunctionReference } from 'convex/server';

/**
 * Wrapper hook for Convex mutations with consistent naming
 */
export const useConvexMutation = <Args, Return>(
  mutationRef: FunctionReference<'mutation', 'public', Args, Return>
) => {
  return useMutation(mutationRef);
};