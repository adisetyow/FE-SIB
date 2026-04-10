/**
 * hooks/usePolling.js
 * Custom hook untuk polling status task analysis.
 *
 * - Polling setiap `interval` ms selama status PENDING atau PROCESSING
 * - Otomatis berhenti saat status COMPLETED atau FAILED
 * - Mengembalikan data task terbaru, status polling, dan fungsi stop manual
 *
 * Cara pakai:
 *   const { task, isPolling, stopPolling } = usePolling(taskId, {
 *     interval: 2000,
 *     onCompleted: (task) => { ... },
 *     onFailed:    (task) => { ... },
 *   })
 */
import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { analysisApi } from "../api/analysisApi";

const TERMINAL_STATUSES = ["COMPLETED", "FAILED"];

export function usePolling(
  taskId,
  { interval = 2500, onCompleted = null, onFailed = null, enabled = true } = {},
) {
  const qc = useQueryClient();
  const calledRef = useRef(false); // hindari panggil callback lebih dari sekali

  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analysis-task", taskId],
    queryFn: () => analysisApi.getTask(taskId),
    enabled: !!taskId && enabled,

    // Polling: cek setiap `interval` ms selama status belum terminal
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL_STATUSES.includes(status)) return false;
      return interval;
    },

    // Jangan refetch saat window focus — kita pakai polling manual
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Panggil callback saat status berubah ke terminal
  useEffect(() => {
    if (!task || calledRef.current) return;
    if (task.status === "COMPLETED") {
      calledRef.current = true;
      onCompleted?.(task);
    } else if (task.status === "FAILED") {
      calledRef.current = true;
      onFailed?.(task);
    }
  }, [task?.status]);

  // Reset called flag saat taskId berubah
  useEffect(() => {
    calledRef.current = false;
  }, [taskId]);

  const stopPolling = useCallback(() => {
    qc.cancelQueries({ queryKey: ["analysis-task", taskId] });
  }, [taskId, qc]);

  const isPolling = !!task && !TERMINAL_STATUSES.includes(task?.status);

  return { task, isLoading, error, isPolling, stopPolling };
}
