import { TiDelete } from "react-icons/ti";

interface ModalProps {
	isOpen: boolean;
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	footerButtons?: React.ReactNode;
	maxWidth?: string;
	width?: string;
	size?: string;
	className?: string;
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
	className = ""
}) => {
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
		<div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-2 sm:p-4 overflow-y-auto">
			<div className={`bg-white rounded-xl shadow-2xl ${resolvedWidth} px-3.5 sm:px-5 py-3 sm:py-3.5 flex flex-col relative max-h-[92vh] overflow-y-auto ${className}`}>
				<div className="flex justify-between items-center pb-2 border-b border-gray-100">
					<h2 className="text-base font-semibold text-black">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-lg hover:bg-gray-100 cursor-pointer"
						title="Close Modal"
					>
						<TiDelete className="text-2xl text-red-500 transition-colors" />
					</button>
				</div>
				<div className="mt-2.5 flex-1">{children}</div>
				{footerButtons && <div className="flex justify-end gap-3 mt-auto pt-2.5 border-t border-gray-100">{footerButtons}</div>}
			</div>
		</div>
	);
};

export default Modal;
