import Button from "@/components/button/Button";
import SelectInput from "@/components/form/SelectField";
import InputField from "@/components/form/TextInput";
import ToggleInput from "@/components/form/ToggleInput";
import ImageUpload from "@/components/image/ImageUpload";
import Modal from "@/components/modal/Modal";
import { ChangeEvent, useEffect, useState } from "react";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { firstCategoryQueryKey } from "@/config/query-key";

interface Option {
	label: string;
	value: string;
}

const initialFieldValues = {
	name: "",
	bannerImage: "" as string | File,
	mainCategoryId: "",
	mainCategoryName: "",
	status: true
};

const requiredFields = [
	{ key: "bannerImage", value: "image", label: "image" },
	{ key: "name", value: "name", label: "name" },
	{ key: "mainCategoryId", value: "main category", label: "dropdown" }
];

const CategoryForm = ({ isOpen, onClose, editData, fetchData }: any) => {
	const { postFormMutation, patchFormMutation, handleApiMutation, fetchData: fetchApiData } = useAPI();
	const [fieldValues, setFieldValues] = useState(initialFieldValues);
	const [isLoading, setIsLoading] = useState(false);
	const [mainCategories, setMainCategories] = useState<any>([]);
	const [selectedMainCategory, setSelectedMainCategory] = useState<Option | null>(null);
	const apiUrl = apiConfig.inventory.firstCategoryUrl;
	const mainCategoryUrl = apiConfig.inventory.mainCategoryUrl;

	const fetchMainCategoryData = async () => {
		try {
			const res = await fetchApiData({ apiUrl: mainCategoryUrl });
			const list = Array.isArray(res) ? res : res?.mainCategory || res?.data || [];
			setMainCategories(list);
		} catch (err) {
			console.error("Fetch failed:", err);
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchMainCategoryData();
		}
	}, [isOpen]);

	const formattedMainCategories = (mainCategories || []).map((item: any) => ({
		label: item.name || item.title || "",
		value: item.id || item._id || ""
	}));

	const handleSelectedMainCategory = (category: Option) => {
		setSelectedMainCategory(category);
		setFieldValues((prevState) => ({
			...prevState,
			mainCategoryId: category.value,
			mainCategoryName: category.label
		}));
	};

	useEffect(() => {
		if (editData) {
			setFieldValues({
				...editData,
				status: editData.status !== undefined ? Boolean(editData.status) : true
			});
			if (editData.mainCategoryId) {
				setSelectedMainCategory({
					label: editData.mainCategoryName || "",
					value: editData.mainCategoryId
				});
			}
		} else {
			setFieldValues(initialFieldValues);
			setSelectedMainCategory(null);
		}
	}, [editData, isOpen]);

	const resetForm = () => {
		setFieldValues(initialFieldValues);
		setSelectedMainCategory(null);
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setFieldValues((prevState) => ({
			...prevState,
			[name]: value
		}));
	};

	const handleImageUpload = (file: File | null) => {
		if (file) {
			setFieldValues((prevState) => ({ ...prevState, bannerImage: file }));
		}
	};

	const handleSwitchChange = (checked: boolean) => {
		setFieldValues((prevState) => ({
			...prevState,
			status: checked,
		}));
	};

	const handleSubmitForm = async () => {
		setIsLoading(true);
		const mutation = editData ? patchFormMutation : postFormMutation;
		const url = editData ? `${apiUrl}/${editData.id}` : apiUrl;

		const result = await handleApiMutation({
			mutation,
			url,
			body: fieldValues,
			invalidateQueryKey: [firstCategoryQueryKey],
			showSuccessMessage: true,
			showErrorMessage: true,
			requiredFields
		});

		if (result?.success) {
			onClose();
			resetForm();
			if (fetchData) fetchData();
		}
		setIsLoading(false);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={editData ? "Edit First Category" : "Create First Category"}
			footerButtons={
				<>
					<Button
						label="Cancel"
						onClick={onClose}
						color="var(--color-secondary)"
						hoverColor="var(--color-secondary-hover)"
					/>
					<Button
						label="Save"
						onClick={handleSubmitForm}
						color="var(--color-primary)"
						hoverColor="var(--color-primary-hover)"
						isLoading={isLoading}
						disabled={isLoading}
					/>
				</>
			}
		>
			<div className="space-y-4">
				<div>
					<h3 className="block text-sm font-medium text-[var(--ui-text)]">Banner Image:
						<span className="text-xs text-[var(--ui-text-muted)] ml-1">(Recommended Size: 1920x192 PX)</span>
					</h3>
					<ImageUpload
						value={
							typeof fieldValues.bannerImage === "string"
								? fieldValues.bannerImage
								: fieldValues.bannerImage
								? URL.createObjectURL(fieldValues.bannerImage)
								: ""
						}
						onChange={handleImageUpload}
					/>
				</div>

				<div>
					<InputField
						label="Name"
						type="text"
						name="name"
						value={fieldValues.name}
						required
						onChange={handleChange}
					/>
				</div>

				<SelectInput
					label="Main Category"
					value={selectedMainCategory}
					options={formattedMainCategories}
					onChange={handleSelectedMainCategory}
					placeholder="Select Main Category"
					showTop={true}
					required
				/>

				<ToggleInput
					label="Status"
					name="status"
					checked={Boolean(fieldValues.status)}
					onChange={handleSwitchChange}
				/>
			</div>
		</Modal>
	);
};

export default CategoryForm;