"use client";

import React, { useEffect } from "react";
import { Address } from "@/lib/addresses-manager";
import { AddressFlow } from "@/components/MapAddressPicker/AddressFlow";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect?: (address: Address) => void;
}

export function AddressModal({ isOpen, onClose, onAddressSelect }: AddressModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.dataset.addressModalOpen = "true";
      window.dispatchEvent(new CustomEvent("address-modal-state", { detail: { active: true } }));
    } else {
      delete document.body.dataset.addressModalOpen;
      window.dispatchEvent(new CustomEvent("address-modal-state", { detail: { active: false } }));
    }

    return () => {
      delete document.body.dataset.addressModalOpen;
      window.dispatchEvent(new CustomEvent("address-modal-state", { detail: { active: false } }));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[92vh] sm:h-[680px] w-full sm:max-w-md flex-col overflow-hidden rounded-t-[28px] sm:rounded-3xl bg-[#FAF8F5] shadow-2xl transition-all"
      >
        <AddressFlow
          isModal={true}
          onClose={onClose}
          onSuccess={(addr) => {
            if (onAddressSelect) onAddressSelect(addr);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export default AddressModal;
