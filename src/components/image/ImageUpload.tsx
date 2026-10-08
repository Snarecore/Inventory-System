import React, { useEffect, useState, useId } from "react";
import { IoCloseSharp, IoCloudUploadOutline } from "react-icons/io5";

interface ImageUploadProps {
	value: string | null;
	onChange: (file: File | null) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange }) => {
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

	return (
		<div className="flex flex-row items-start space-x-3">
			<label
				htmlFor={`${id}-file-upload`}
				className="w-[120px] h-[120px] flex items-center justify-center flex-col gap-2 border border-dashed border-[var(--color-primary)] bg-sky-50/40 text-[var(--color-primary)] text-sm rounded-md cursor-pointer hover:bg-sky-50/80 transition-all ease-in-out duration-300 mt-2"
			>
				<IoCloudUploadOutline size={22} className="text-[var(--color-primary)]" />
				<p className="font-semibold text-xs">Upload Image</p>
			</label>
			<input
				id={`${id}-file-upload`}
				type="file"
				className="hidden"
				onChange={onSelectFile}
				accept="image/png, image/jpeg, image/jpg"
			/>
			{preview && (
				<div className="relative w-[120px] h-[120px]">
					<img
						src={preview}
						alt="Uploaded File"
						className="w-full h-full object-cover rounded-lg border border-gray-300 mt-2"
						onError={() => setPreview(null)}
					/>
					<button onClick={removeImage} className="absolute top-3 right-1 bg-red-500 text-white rounded-md cursor-pointer hover:bg-red-600 hover:text-white transition-all duration-300">
						<IoCloseSharp size={14} />
					</button>
				</div>
			)}
		</div>
	);
};

export default ImageUpload;
