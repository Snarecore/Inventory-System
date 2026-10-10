import React, { useEffect, useState, useId } from "react";
import { IoCloseSharp, IoCloudUploadOutline, IoDocumentTextOutline } from "react-icons/io5";

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
		if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
			return url;
		}
		const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://itouch.stepserp.com/cash-boi-v4/api";
		const serverHost = rawBaseUrl.replace(/\/api\/?$/, "");
		const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
		return `${serverHost}/${cleanUrl}`;
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
				className={`${dimensionClass} group flex items-center justify-center flex-col gap-1 border border-dashed border-[#0F365C] bg-sky-50/50 hover:bg-sky-100/50 text-[#0F365C] text-xs rounded-xl cursor-pointer transition-all duration-200`}
			>
				<IoCloudUploadOutline size={size === "sm" ? 20 : 24} className="text-[#0F365C] group-hover:-translate-y-0.5 transition-all" />
				<p className="font-semibold text-[11px] text-[#0F365C] transition-colors">Upload Image</p>
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
							className="w-full h-full object-cover rounded-xl border border-gray-200 bg-white shadow-2xs"
							onError={() => setHasImgError(true)}
						/>
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-1 text-center shadow-2xs">
							<IoDocumentTextOutline size={22} className="text-gray-400 mb-1" />
							<span className="text-[11px] font-semibold text-gray-600 truncate max-w-full px-1">Attached</span>
						</div>
					)}
					<button
						type="button"
						onClick={removeImage}
						className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md cursor-pointer hover:bg-rose-600 hover:scale-110 transition-all duration-200"
					>
						<IoCloseSharp size={13} />
					</button>
				</div>
			)}
		</div>
	);
};

export default ImageUpload;
