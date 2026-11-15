import React from "react";
import { useTranslation } from "react-i18next";
import { FiTrash2 } from "react-icons/fi";

export interface DeleteModalProps {
	isOpen: boolean;
	title: string;
	message: string;
	onClose: () => void;
	onDelete: () => void;
	children?: React.ReactNode;
	isLoading?: boolean;
	deleteText?: string;
	cancelText?: string;
	isDeleteDisabled?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
	isOpen,
	title,
	message,
	onClose,
	onDelete,
	children,
	isLoading = false,
	deleteText = "Delete",
	cancelText = "Cancel",
	isDeleteDisabled = false,
}) => {
	const { t } = useTranslation();
	if (!isOpen) return null;
	return (
		<div className="ui-modal-backdrop fixed inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-text)_72%,transparent)] bg-opacity-50 z-[9999] p-2">
			<div className="ui-modal-panel bg-[var(--ui-surface)] rounded-lg shadow-lg w-[400px] p-8 sm:p-10 relative" role="dialog" aria-labelledby="delete-modal-title">
				<div className="flex flex-col items-center text-center">
					<div className="bg-[var(--ui-danger-light)] p-3 rounded-full">
						<FiTrash2 className="text-2xl text-[var(--ui-danger)]" />
					</div>
					<h2 id="delete-modal-title" className="text-lg font-semibold mt-3">{t(title)}</h2>
					<p className="text-sm text-[var(--ui-text-muted)] mt-1">{t(message)}</p>
				</div>
				{children && <div className="mt-4 w-full">{children}</div>}
				<div className="flex justify-center gap-4 mt-6">
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						className="px-4 py-2 text-[var(--ui-text-muted)] border border-[var(--ui-border-strong)] rounded-md cursor-pointer hover:bg-[var(--ui-surface-sunken)] transition disabled:opacity-50"
					>
						{t(cancelText)}
					</button>
					<button
						type="button"
						onClick={onDelete}
						disabled={isLoading || isDeleteDisabled}
						className="px-4 py-2 bg-[var(--ui-danger)] text-white rounded-md cursor-pointer hover:bg-[var(--ui-danger-dark)] transition disabled:opacity-50"
					>
						{isLoading ? t("Deleting...") : t(deleteText)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default DeleteModal;
