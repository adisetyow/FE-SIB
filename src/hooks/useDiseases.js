import { useQuery } from "@tanstack/react-query";
import { diseasesApi } from "../api/diseasesApi";

export const useDiseases = (params) => {
  return useQuery({
    queryKey: ["diseases", params],
    queryFn: () => diseasesApi.listDiseases(params),
  });
};
