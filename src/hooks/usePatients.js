import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "../api/patientsApi";

export const usePatients = (params) => {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: () => patientsApi.listPatients(params),
  });
};
