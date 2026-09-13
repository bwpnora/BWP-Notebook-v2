/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState } from "react";
import { CheckCircle2, Copy, Check, Eye, EyeOff, ShieldCheck, KeyRound, User, Building2, Globe } from "lucide-react";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import { copyTextToClipboard } from "@plane/utils";

export type TCredentialSummaryCardProps = {
  displayName: string;
  username: string;
  password: string;
  role: number;
  email?: string | null;
  projectName?: string;
  projectRole?: number;
  onClose: () => void;
  onReset?: () => void;
};

const getRoleLabel = (role: number): string => {
  switch (role) {
    case 20:
      return "Quản trị viên (Admin)";
    case 15:
      return "Thành viên (Member)";
    case 5:
      return "Khách (Guest)";
    default:
      return "Thành viên";
  }
};

export const CredentialSummaryCard: React.FC<TCredentialSummaryCardProps> = ({
  displayName,
  username,
  password,
  role,
  email,
  projectName,
  projectRole,
  onClose,
  onReset,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loginUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopySingleField = async (text: string, fieldName: string) => {
    try {
      await copyTextToClipboard(text);
      setCopiedField(fieldName);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Đã sao chép!",
        message: `Đã sao chép ${fieldName} vào bộ nhớ tạm.`,
      });
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Lỗi",
        message: "Không thể sao chép vào bộ nhớ tạm.",
      });
    }
  };

  const handleCopyAll = async () => {
    const lines = [
      "=== THÔNG TIN BÀN GIAO TÀI KHOẢN ===",
      `Họ và tên: ${displayName}`,
      `Tên đăng nhập: ${username}`,
      `Mật khẩu: ${password}`,
      `Vai trò đơn vị: ${getRoleLabel(role)}`,
    ];

    if (projectName) {
      lines.push(`Phòng ban: ${projectName}`);
      if (projectRole) {
        lines.push(`Vai trò phòng ban: ${getRoleLabel(projectRole)}`);
      }
    }

    if (email) {
      lines.push(`Email: ${email}`);
    }

    if (loginUrl) {
      lines.push(`Đường dẫn đăng nhập: ${loginUrl}`);
    }

    lines.push("====================================");

    const handoverText = lines.join("\n");

    try {
      await copyTextToClipboard(handoverText);
      setCopiedField("all");
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Đã sao chép!",
        message: "Thông tin bàn giao tài khoản đã được lưu vào bộ nhớ tạm.",
      });
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Lỗi",
        message: "Không thể sao chép vào bộ nhớ tạm.",
      });
    }
  };

  return (
    <div className="space-y-5 p-5">
      {/* Header status */}
      <div className="border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 rounded-lg border p-4">
        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 mt-0.5 h-6 w-6 shrink-0" />
        <div>
          <h3 className="text-emerald-900 dark:text-emerald-200 text-16 font-semibold">
            ✓ Khởi tạo tài khoản thành công!
          </h3>
          <p className="text-emerald-700 dark:text-emerald-300/90 mt-0.5 text-13">
            Tài khoản đã sẵn sàng để đăng nhập. Vui lòng sao chép thông tin xác thực dưới đây để bàn giao cho nhân sự.
          </p>
        </div>
      </div>

      {/* Credential summary details */}
      <div className="divide-y divide-subtle rounded-lg border border-subtle bg-surface-2">
        {/* Full Name */}
        <div className="flex items-center justify-between px-4 py-3 text-13">
          <div className="flex items-center gap-2 text-secondary">
            <User className="h-4 w-4" />
            <span>Họ và tên:</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-primary">
            <span>{displayName}</span>
            <button
              type="button"
              onClick={() => handleCopySingleField(displayName, "Họ và tên")}
              className="rounded p-1 text-placeholder transition-colors hover:bg-layer-1 hover:text-primary"
              aria-label="Sao chép họ và tên"
            >
              {copiedField === "Họ và tên" ? (
                <Check className="text-success h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="flex items-center justify-between px-4 py-3 text-13">
          <div className="flex items-center gap-2 text-secondary">
            <ShieldCheck className="h-4 w-4" />
            <span>Tên đăng nhập:</span>
          </div>
          <div className="font-mono flex items-center gap-2 font-medium text-primary">
            <span className="rounded border border-subtle bg-surface-1 px-2 py-0.5">{username}</span>
            <button
              type="button"
              onClick={() => handleCopySingleField(username, "Tên đăng nhập")}
              className="rounded p-1 text-placeholder transition-colors hover:bg-layer-1 hover:text-primary"
              aria-label="Sao chép tên đăng nhập"
            >
              {copiedField === "Tên đăng nhập" ? (
                <Check className="text-success h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between px-4 py-3 text-13">
          <div className="flex items-center gap-2 text-secondary">
            <KeyRound className="h-4 w-4" />
            <span>Mật khẩu:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono rounded border border-subtle bg-surface-1 px-2 py-0.5 text-13 font-medium text-primary">
              {showPassword ? password : "••••••••••••••"}
            </span>
            <Tooltip tooltipContent={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="rounded p-1 text-placeholder transition-colors hover:bg-layer-1 hover:text-primary"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={() => handleCopySingleField(password, "Mật khẩu")}
              className="rounded p-1 text-placeholder transition-colors hover:bg-layer-1 hover:text-primary"
              aria-label="Sao chép mật khẩu"
            >
              {copiedField === "Mật khẩu" ? (
                <Check className="text-success h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Workspace Role */}
        <div className="flex items-center justify-between px-4 py-3 text-13">
          <span className="text-secondary">Vai trò đơn vị:</span>
          <span className="font-medium text-primary">{getRoleLabel(role)}</span>
        </div>

        {/* Department / Project if any */}
        {projectName && (
          <div className="flex items-center justify-between px-4 py-3 text-13">
            <div className="flex items-center gap-2 text-secondary">
              <Building2 className="h-4 w-4" />
              <span>Phòng ban:</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <span>{projectName}</span>
              {projectRole && <span className="text-xs text-secondary">({getRoleLabel(projectRole)})</span>}
            </div>
          </div>
        )}

        {/* Email if any */}
        {email && (
          <div className="flex items-center justify-between px-4 py-3 text-13">
            <span className="text-secondary">Email:</span>
            <span className="font-medium text-primary">{email}</span>
          </div>
        )}

        {/* Login URL */}
        {loginUrl && (
          <div className="flex items-center justify-between px-4 py-3 text-13">
            <div className="flex items-center gap-2 text-secondary">
              <Globe className="h-4 w-4" />
              <span>Đường dẫn đăng nhập:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="max-w-[220px] truncate text-12 font-medium text-secondary">{loginUrl}</span>
              <button
                type="button"
                onClick={() => handleCopySingleField(loginUrl, "Đường dẫn đăng nhập")}
                className="rounded p-1 text-placeholder transition-colors hover:bg-layer-1 hover:text-primary"
                aria-label="Sao chép đường dẫn đăng nhập"
              >
                {copiedField === "Đường dẫn đăng nhập" ? (
                  <Check className="text-success h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security alert */}
      <p className="text-12 text-placeholder">
        Lưu ý: Thông tin mật khẩu chỉ được hiển thị đầy đủ tại màn hình này. Hãy đảm bảo sao chép và lưu trữ an toàn
        trước khi đóng.
      </p>

      {/* Action buttons */}
      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-2 sm:flex-row">
        {onReset ? (
          <Button variant="secondary" size="lg" onClick={onReset}>
            Tạo thêm tài khoản khác
          </Button>
        ) : (
          <div />
        )}
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Hoàn tất
          </Button>
          <Button variant="primary" size="lg" onClick={handleCopyAll} className="flex items-center gap-2">
            {copiedField === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Sao chép thông tin bàn giao
          </Button>
        </div>
      </div>
    </div>
  );
};
