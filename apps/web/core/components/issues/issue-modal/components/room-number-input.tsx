/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { DoorClosed, X } from "lucide-react";
import { Button } from "@plane/propel/button";
import { cn } from "@plane/utils";
import { usePlatformOS } from "@/hooks/use-platform-os";

type Props = {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  onFormChange?: () => void;
  tabIndex?: number;
};

export const RoomNumberInput: React.FC<Props> = ({ value, onChange, onFormChange, tabIndex }) => {
  const { isMobile } = usePlatformOS();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempRoom, setTempRoom] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const handleOpenModal = () => {
    setTempRoom(value !== null && value !== undefined ? String(value) : "");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = () => {
    const trimmed = tempRoom.trim();
    if (!trimmed) {
      onChange(null);
    } else {
      const parsed = parseInt(trimmed, 10);
      onChange(isNaN(parsed) ? null : parsed);
    }
    onFormChange?.();
    setIsModalOpen(false);
  };

  const handleClear = () => {
    setTempRoom("");
    onChange(null);
    onFormChange?.();
    setIsModalOpen(false);
  };

  if (isMobile) {
    const hasValue = value !== null && value !== undefined;
    return (
      <>
        <button
          type="button"
          onClick={handleOpenModal}
          tabIndex={tabIndex}
          className={cn(
            "text-xs flex h-8 items-center gap-1.5 rounded-md border-[0.5px] px-2.5 py-1 font-medium transition-colors select-none",
            hasValue
              ? "border-accent-primary/60 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20"
              : "border-strong bg-transparent text-secondary hover:bg-layer-1 hover:text-primary"
          )}
        >
          <DoorClosed className="h-4 w-4 flex-shrink-0" />
          <span>{hasValue ? `Phòng: ${value}` : "Phòng: Chưa có"}</span>
        </button>

        <Transition.Root show={isModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-[60]" onClose={handleCloseModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" />
            </Transition.Child>

            <div className="fixed inset-0 z-[60] overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-200"
                  enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
                  enterTo="opacity-100 translate-y-0 sm:scale-100"
                  leave="ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                  leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
                >
                  <Dialog.Panel className="shadow-2xl w-full max-w-sm rounded-xl border border-subtle bg-surface-1 p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-subtle pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-layer-2 text-primary">
                          <DoorClosed className="h-5 w-5" />
                        </div>
                        <div>
                          <Dialog.Title as="h3" className="text-sm font-semibold text-primary">
                            Nhập số phòng
                          </Dialog.Title>
                          <p className="text-xs text-placeholder">Ví dụ: 101, 202, 305...</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        aria-label="Đóng"
                        className="rounded-md p-1.5 text-placeholder transition-colors hover:bg-layer-2 hover:text-primary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Input Field */}
                    <div className="py-4">
                      <div className="relative flex items-center">
                        <input
                          ref={inputRef}
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={tempRoom}
                          onChange={(e) => setTempRoom(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSave();
                            }
                          }}
                          placeholder="Nhập số phòng..."
                          className="text-base focus:border-accent-primary h-12 w-full [appearance:textfield] rounded-lg border border-strong bg-layer-1 px-4 font-medium text-primary transition-colors outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        {tempRoom && (
                          <button
                            type="button"
                            onClick={() => {
                              setTempRoom("");
                              inputRef.current?.focus();
                            }}
                            aria-label="Xóa nội dung nhập"
                            className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full bg-layer-3 text-placeholder transition-colors hover:text-primary"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {hasValue && (
                        <Button
                          type="button"
                          variant="error-outline"
                          size="xl"
                          className="flex-1"
                          onClick={handleClear}
                        >
                          Xóa
                        </Button>
                      )}
                      <Button type="button" variant="secondary" size="xl" className="flex-1" onClick={handleCloseModal}>
                        Hủy
                      </Button>
                      <Button type="button" variant="primary" size="xl" className="flex-1" onClick={handleSave}>
                        Xác nhận
                      </Button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition.Root>
      </>
    );
  }

  // Desktop view
  const hasValue = value !== null && value !== undefined;
  return (
    <label
      htmlFor="issue-room-desktop-input"
      className={cn(
        "focus-within:border-secondary flex h-7 cursor-text items-center gap-1.5 rounded-sm border-[0.5px] border-strong bg-transparent px-2 py-0.5 text-caption-sm-regular text-secondary transition-colors hover:bg-layer-1",
        hasValue && "border-secondary/60 text-primary"
      )}
    >
      <DoorClosed className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />
      <span className="whitespace-nowrap text-secondary">Phòng:</span>
      <input
        id="issue-room-desktop-input"
        ref={desktopInputRef}
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => {
          const val = e.target.value ? parseInt(e.target.value, 10) : null;
          onChange(val);
          onFormChange?.();
        }}
        placeholder="Số"
        className="w-14 [appearance:textfield] bg-transparent text-caption-sm-regular text-primary outline-none placeholder:text-placeholder [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        tabIndex={tabIndex}
      />
      {hasValue && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(null);
            onFormChange?.();
          }}
          className="ml-0.5 text-placeholder transition-colors hover:text-primary"
          title="Xóa số phòng"
          aria-label="Xóa số phòng"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </label>
  );
};
