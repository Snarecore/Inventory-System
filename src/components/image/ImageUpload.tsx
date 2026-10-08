import React, { useEffect, useState, useId } from "react";
import { IoCloseSharp, IoCloudUploadOutline } from "react-icons/io5";

interface ImageUploadProps {
	value: string | null;
	onChange: (file: File | null) => void;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, size = "sm", className = "" }) => {
	const id = useId();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(value);

	useEffect(() => {
		if (!selectedFile) {
			setPreview(value || null);
			return;
		}
		const objectUrl = URL.createObjectURL(selectedFile);
		setPreview(objectUrl);

		return () => URL.revokeObjectURL(objectUrl);
	}, [selectedFile, value]);

	const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) {
			setSelectedFile(null);
			return;
		}
		const file = e.target.files[0];
		setSelectedFile(file);
		onChange(file);
	};

	const removeImage = () => {
		setSelectedFile(null);
		setPreview(null);
		onChange(null);
	};

	const dimensionClass = size === "sm" ? "w-[84px] h-[84px]" : size === "lg" ? "w-[120px] h-[120px]" : "w-[96px] h-[96px]";

	return (
		<div className={`flex flex-row items-start space-x-2.5 ${className}`}>
			<label
				htmlFor={`${id}-file-upload`}
				className={`${dimensionClass} flex items-center justify-center flex-col gap-1 border border-dashed border-[var(--color-primary)] bg-sky-50/40 text-[var(--color-primary)] text-xs rounded-lg cursor-pointer hover:bg-sky-50/80 transition-all ease-in-out duration-300 mt-1`}
			>
				<IoCloudUploadOutline size={size === "sm" ? 18 : 22} className="text-[var(--color-primary)]" />
				<p className="font-semibold text-[10px]">Upload Image</p>
			</label>
			<input
				id={`${id}-file-upload`}
				type="file"
				className="hidden"
				onChange={onSelectFile}
				accept="image/png, image/jpeg, image/jpg"
			/>
			{preview && (
				<div className={`relative ${dimensionClass} mt-1`}>
					<img
						src={preview}
						alt="Uploaded File"
						className="w-full h-full object-cover rounded-lg border border-gray-300"
						onError={() => setPreview(null)}
					/>
					<button
						type="button"
						onClick={removeImage}
						className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md cursor-pointer hover:bg-rose-600 transition-all duration-300"
					>
						<IoCloseSharp size={13} />
					</button>
				</div>
			)}
		</div>
	);
};

export default ImageUpload;
