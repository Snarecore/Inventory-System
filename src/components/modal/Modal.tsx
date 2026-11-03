import React, { useRef } from "react";
import { TiDelete } from "react-icons/ti";
import { useFormKeyboardNavigation } from "@/hooks/useFormKeyboardNavigation";

interface ModalProps {
	isOpen: boolean;
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	footerButtons?: React.ReactNode;
	maxWidth?: string;
	width?: string;
	size?: string;
	zIndex?: string;
	className?: string;
	headerClassName?: string;
	bodyClassName?: string;
	autoFocusFirst?: boolean;
	enableArrowKeys?: boolean;
	enableEnterNavigation?: boolean;
}

const Modal: React.FC<ModalProps> = ({
	isOpen,
	title,
	onClose,
	children,
	footerButtons,
	maxWidth,
	width,
	size,
	zIndex = "z-50",
	className = "",
	headerClassName = "",
	bodyClassName = "",
	autoFocusFirst = true,
	enableArrowKeys = true,
	enableEnterNavigation = true,
}) => {
	const panelRef = useRef<HTMLDivElement>(null);

	useFormKeyboardNavigation(panelRef, {
		autoFocusFirst,
		enableArrowKeys,
		enableEnterNavigation,
		isActive: isOpen,
	});

	if (!isOpen) return null;
	const resolvedWidth =
		width ||
		maxWidth ||
		(size === "xl" || size === "3xl"
			? "w-full max-w-3xl"
			: size === "2xl" || size === "4xl"
			? "w-full max-w-4xl"
			: size === "lg"
			? "w-full max-w-xl"
			: "w-full max-w-[450px]");

	return (
		<div className={`ui-modal-backdrop fixed inset-0 flex items-center justify-center bg-[var(--ui-text)]/60 ${zIndex} p-2 sm:p-4 overflow-y-auto`}>
			<div ref={panelRef} className={`ui-modal-panel bg-[var(--ui-surface)] rounded-xl shadow-2xl ${resolvedWidth} px-3.5 sm:px-5 py-3 sm:py-3.5 flex flex-col relative max-h-[92vh] overflow-y-auto ${className}`}>
				<div className={`flex justify-between items-center pb-2 border-b border-[var(--ui-border)] ${headerClassName}`}>
					<h2 className="text-base font-semibold text-[var(--ui-text)]">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--ui-text-subtle)] hover:text-[var(--ui-danger)] transition-colors p-0.5 rounded-lg hover:bg-[var(--ui-surface-sunken)] cursor-pointer"
						title="Close Modal"
					>
						<TiDelete className="text-2xl text-[var(--ui-danger)] transition-colors" />
					</button>
				</div>
				<div className={`mt-2.5 flex-1 ${bodyClassName}`}>{children}</div>
				{footerButtons && <div className="flex justify-end gap-3 mt-auto pt-2.5 border-t border-[var(--ui-border)]">{footerButtons}</div>}
			</div>
		</div>
	);
};

export default Modal;
