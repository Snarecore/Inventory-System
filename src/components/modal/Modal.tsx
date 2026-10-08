import { TiDelete } from "react-icons/ti";

interface ModalProps {
	isOpen: boolean;
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	footerButtons?: React.ReactNode;
	maxWidth?: string;
	className?: string;
}

const Modal: React.FC<ModalProps> = ({
	isOpen,
	title,
	onClose,
	children,
	footerButtons,
	maxWidth = "w-full max-w-[450px]",
	className = ""
}) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-2 sm:p-4 overflow-y-auto">
			<div className={`bg-white rounded-xl shadow-2xl ${maxWidth} px-3.5 sm:px-5 py-3.5 sm:py-4 flex flex-col relative max-h-[92vh] overflow-y-auto ${className}`}>
				<div className="flex justify-between items-center pb-2.5 border-b border-gray-100">
					<h2 className="text-base font-semibold text-black">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
					>
						<TiDelete className="text-2xl text-red-500 hover:text-red-600" />
					</button>
				</div>
				<div className="mt-3 flex-1">{children}</div>
				{footerButtons && <div className="flex justify-end gap-3 mt-auto pt-3 border-t border-gray-100">{footerButtons}</div>}
			</div>
		</div>
	);
};

export default Modal;
