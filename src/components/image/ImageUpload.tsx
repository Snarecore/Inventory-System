import React, { useEffect, useState, useId } from "react";
import { IoCloseSharp, IoCloudUploadOutline, IoDocumentTextOutline } from "react-icons/io5";
import { getFileViewUrl } from "@/services/file-upload-service";

interface ImageUploadProps {
	value: string | File | null;
	onChange: (file: File | null) => void;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, size = "sm", className = "" }) => {
	const id = useId();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [hasImgError, setHasImgError] = useState<boolean>(false);

	const getDisplayUrl = (url: string | null) => {
		if (!url) return "";
		const trimmed = url.trim();
		if (trimmed.startsWith("blob:") || trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
			return trimmed;
		}
		return getFileViewUrl(trimmed);
	};

	useEffect(() => {
		setHasImgError(false);
		if (!value) {
			setPreview(null);
			return;
		}

		if (value instanceof File) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreview(reader.result as string);
			};
			reader.readAsDataURL(value);
			return;
		}

		if (typeof value === "string") {
			const clean = value.trim();
			if (clean === "" || clean === "null" || clean === "undefined" || clean === "1") {
				setPreview(null);
			} else {
				setPreview(clean);
			}
		}
	}, [value]);

	const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) {
			setSelectedFile(null);
			return;
		}
		const file = e.target.files[0];
		setSelectedFile(file);
		setHasImgError(false);
		onChange(file);
	};

	const removeImage = () => {
		setSelectedFile(null);
		setPreview(null);
		setHasImgError(false);
		onChange(null);
	};

	const dimensionClass = size === "sm" ? "w-[84px] h-[84px]" : size === "lg" ? "w-[120px] h-[120px]" : "w-[96px] h-[96px]";

	return (
		<div className={`flex flex-row items-start space-x-2.5 ${className}`}>
			<label
				htmlFor={`${id}-file-upload`}
				className={`${dimensionClass} group flex items-center justify-center flex-col gap-0.5 border border-dashed border-[var(--primary-color)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color-muted)] text-[var(--primary-color)] text-xs rounded-xl cursor-pointer transition-all duration-200 p-1`}
			>
				<IoCloudUploadOutline size={size === "sm" ? 20 : 24} className="text-[var(--primary-color)] group-hover:-translate-y-0.5 transition-all shrink-0" />
				<span className="font-semibold text-[11px] leading-tight text-center text-[var(--primary-color)] transition-colors flex flex-col items-center">
					<span>Upload</span>
					<span>Image</span>
				</span>
			</label>
			<input
				id={`${id}-file-upload`}
				type="file"
				className="hidden"
				onChange={onSelectFile}
				accept="image/png, image/jpeg, image/jpg"
			/>
			{preview && (
				<div className={`relative ${dimensionClass}`}>
					{!hasImgError ? (
						<img
							src={getDisplayUrl(preview)}
							alt="Uploaded File"
							className="w-full h-full object-cover rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-2xs"
							onError={() => setHasImgError(true)}
						/>
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] rounded-xl p-1 text-center shadow-2xs">
							<IoDocumentTextOutline size={22} className="text-[var(--ui-text-subtle)] mb-1" />
							<span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate max-w-full px-1">Attached</span>
						</div>
					)}
					<button
						type="button"
						onClick={removeImage}
						className="absolute -top-1.5 -right-1.5 bg-[var(--ui-danger)] text-white rounded-full p-0.5 shadow-md cursor-pointer hover:bg-[var(--ui-danger)] hover:scale-110 transition-all duration-200"
					>
						<IoCloseSharp size={13} />
					</button>
				</div>
			)}
		</div>
	);
};

export default ImageUpload;
