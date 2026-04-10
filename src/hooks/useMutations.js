import { useQuery } from "@tanstack/react-query";
import { getMutations } from "../api/mutationsApi";

export const useMutations = (params) => {
  return useQuery({
    queryKey: ["mutations", params],
    queryFn: () => getMutations(params).then((res) => res.data),
  });
};
