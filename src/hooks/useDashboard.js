import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../api/analysisApi";

export const useDashboard = () => {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardStats().then((res) => res.data),
  });
};
