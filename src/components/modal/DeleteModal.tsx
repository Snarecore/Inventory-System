import { FiTrash2 } from "react-icons/fi";

interface DeleteModalProps {
	isOpen: boolean;
	title: string;
	message: string;
	onClose: () => void;
	onDelete: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
	isOpen,
	title,
	message,
	onClose,
	onDelete
}) => {
	if (!isOpen) return null;
	return (
		<div className="ui-modal-backdrop fixed inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-text)_72%,transparent)] bg-opacity-50 z-[9999] p-2">
			<div className="ui-modal-panel bg-[var(--ui-surface)] rounded-lg shadow-lg w-[400px] p-10 relative" role="dialog" aria-labelledby="delete-modal-title">
				<div className="flex flex-col items-center text-center">
					<div className="bg-[var(--ui-danger-light)] p-3 rounded-full">
						<FiTrash2 className="text-2xl text-[var(--ui-danger)]" />
					</div>
					<h2 id="delete-modal-title" className="text-lg font-semibold mt-3">{title}</h2>
					<p className="text-sm text-[var(--ui-text-muted)] mt-1">{message}</p>
				</div>
				<div className="flex justify-center gap-4 mt-6">
					<button onClick={onClose} className="px-4 py-2 text-[var(--ui-text-muted)] border border-[var(--ui-border-strong)] rounded-md cursor-pointer hover:bg-[var(--ui-surface-sunken)] transition">
						Cancel
					</button>
					<button onClick={onDelete} className="px-4 py-2 bg-[var(--ui-danger)] text-white rounded-md cursor-pointer hover:bg-[var(--ui-danger-dark)] transition">
						Delete
					</button>
				</div>
			</div>
		</div>
	);
};

export default DeleteModal;
