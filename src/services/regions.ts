// Regions table does not exist yet in the database
// Placeholder service that returns empty data

import { useQuery } from "@tanstack/react-query";

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => [] as any[],
  });
}
