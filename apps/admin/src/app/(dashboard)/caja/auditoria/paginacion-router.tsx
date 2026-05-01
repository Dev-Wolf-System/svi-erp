"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/shared/pagination";

interface Props {
  page:       number;
  totalPages: number;
  pageSize:   number;
  total:      number;
}

/**
 * Wrapper de <Pagination> para la auditoría:
 * actualiza la URL preservando los demás searchParams.
 */
export function PaginacionRouter({ page, totalPages, pageSize, total }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function go(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    startTransition(() => router.push(`/caja/auditoria?${next.toString()}`));
  }

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      pageSize={pageSize}
      total={total}
      onPageChange={go}
    />
  );
}
