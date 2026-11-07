"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AddressFlow } from "@/components/MapAddressPicker/AddressFlow";

function SelecionarEnderecoContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/cardapio";

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] flex justify-center">
      <div className="w-full max-w-lg min-h-screen bg-white shadow-xl flex flex-col">
        <AddressFlow redirectUrl={redirectTo} />
      </div>
    </div>
  );
}

export default function SelecionarEnderecoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#FAF8F5]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#E59500]" />
            <p className="text-sm font-semibold text-slate-600">
              Carregando endereço...
            </p>
          </div>
        </div>
      }
    >
      <SelecionarEnderecoContent />
    </Suspense>
  );
}
