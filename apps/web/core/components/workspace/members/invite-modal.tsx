/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { IWorkspaceBulkInviteFormData } from "@plane/types";
import { EModalWidth, EModalPosition, ModalCore } from "@plane/ui";
// components
import { InvitationModalActions } from "@/components/workspace/invite-modal/actions";
import { InvitationFields } from "@/components/workspace/invite-modal/fields";
import { InvitationForm } from "@/components/workspace/invite-modal/form";
// hooks
import { useWorkspaceInvitationActions } from "@/hooks/use-workspace-invitation";
import { UserPlus, Mail } from "lucide-react";

export type TSendWorkspaceInvitationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IWorkspaceBulkInviteFormData) => Promise<void> | undefined;
  onSwitchToDirectCreate?: () => void;
};

export const SendWorkspaceInvitationModal = observer(function SendWorkspaceInvitationModal(
  props: TSendWorkspaceInvitationModalProps
) {
  const { isOpen, onClose, onSubmit, onSwitchToDirectCreate } = props;
  // store hooks
  const { t } = useTranslation();
  // router
  const { workspaceSlug } = useParams();
  // derived values
  const { control, fields, formState, remove, onFormSubmit, handleClose, appendField } = useWorkspaceInvitationActions({
    onSubmit,
    onClose,
  });

  return (
    <ModalCore isOpen={isOpen} position={EModalPosition.TOP} width={EModalWidth.XXL}>
      {onSwitchToDirectCreate && (
        <div className="flex gap-4 border-b border-subtle px-5 pt-4 pb-1">
          <button
            type="button"
            onClick={onSwitchToDirectCreate}
            className="flex items-center gap-1.5 border-b-2 border-transparent pb-2 text-13 font-medium text-secondary transition-colors hover:text-primary"
          >
            <UserPlus className="h-4 w-4" />
            Tạo tài khoản trực tiếp
          </button>
          <button
            type="button"
            className="border-accent-primary flex items-center gap-1.5 border-b-2 pb-2 text-13 font-medium text-accent-primary"
          >
            <Mail className="h-4 w-4" />
            Mời qua email
          </button>
        </div>
      )}
      <InvitationForm
        title={t("workspace_settings.settings.members.modal.title")}
        description={t("workspace_settings.settings.members.modal.description")}
        onSubmit={onFormSubmit}
        actions={
          <InvitationModalActions
            isSubmitting={formState.isSubmitting}
            handleClose={handleClose}
            appendField={appendField}
          />
        }
        className="p-5"
      >
        <InvitationFields
          workspaceSlug={workspaceSlug.toString()}
          fields={fields}
          control={control}
          formState={formState}
          remove={remove}
        />
      </InvitationForm>
    </ModalCore>
  );
});
