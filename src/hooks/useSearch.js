import { useQuery } from "@tanstack/react-query";
import { globalSearch } from "../api/searchApi";

export const useSearch = (query) => {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => globalSearch(query).then((res) => res.data),
    enabled: !!query,
  });
};
