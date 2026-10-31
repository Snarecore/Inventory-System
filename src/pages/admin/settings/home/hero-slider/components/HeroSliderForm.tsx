import Modal from "@/components/modal/Modal";
import { useState, ChangeEvent, useEffect } from "react";
import ImageUpload from "@/components/image/ImageUpload";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { heroSliderQueryKey } from "@/config/query-key";
import Button from "@/components/button/Button";
import ToggleInput from "@/components/form/ToggleInput";
import InputField from "@/components/form/TextInput";
import { HeroSliderDataProps } from "./HeroSliderTable";

interface HeroSliderFormProps {
    isOpen: boolean;
    onClose: () => void;
    fetchData?: () => void;
    editData: HeroSliderDataProps | null;
}

const initialFieldValues = {
    link: "",
    image: "" as string | File,
    status: false
};

const requiredFields = [
    { key: "image", value: "image", label: "image" },
    { key: "link", value: "link", label: "link" }
];

const HeroSliderForm = ({ isOpen, onClose, editData, fetchData }: HeroSliderFormProps) => {
    const { postFormMutation, patchFormMutation, handleApiMutation } = useAPI();
    const [isLoading, setIsLoading] = useState(false);
    const [fieldValues, setFieldValues] = useState(initialFieldValues);
    const apiUrl = apiConfig.setting.heroSliderUrl;

    useEffect(() => {
        if (editData) {
            setFieldValues({
                link: editData.link || "",
                image: editData.image || "",
                status: Boolean(editData.status)
            });
        } else {
            setFieldValues(initialFieldValues);
        }
    }, [editData, isOpen]);

    const resetForm = () => {
        setFieldValues(initialFieldValues);
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
            setFieldValues((prevState) => ({ ...prevState, image: file }));
        }
    };

    const handleSwitchChange = (checked: boolean) => {
        setFieldValues((prevState) => ({
            ...prevState,
            status: checked
        }));
    };

    const handleSubmitForm = async () => {
        setIsLoading(true);
        const mutation = editData ? patchFormMutation : postFormMutation;
        const url = editData ? `${apiUrl}/${editData.id}` : apiUrl;

        const result = await handleApiMutation({
            mutation: mutation as any,
            url,
            body: fieldValues as any,
            invalidateQueryKey: [heroSliderQueryKey],
            showSuccessMessage: true,
            showErrorMessage: true,
            requiredFields
        });

        if (result?.success) {
            if (fetchData) fetchData();
            onClose();
            resetForm();
        }
        setIsLoading(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editData ? "Edit Hero Slider" : "Create Hero Slider"}
        >
            <div className="space-y-4">
                <div>
                    <h3 className="block text-sm font-medium text-[var(--ui-text)] mb-1">
                        Image:
                        <span className="text-xs text-[var(--ui-text-muted)] ml-1">(Recommended Size: 1920x400 PX)</span>
                    </h3>
                    <ImageUpload
                        value={
                            typeof fieldValues.image === "string"
                                ? fieldValues.image
                                : fieldValues.image instanceof File
                                ? URL.createObjectURL(fieldValues.image)
                                : ""
                        }
                        onChange={handleImageUpload}
                    />
                </div>
                <div>
                    <InputField
                        label="Link"
                        type="text"
                        name="link"
                        value={fieldValues.link}
                        required
                        onChange={handleChange}
                        placeholder="https://example.com/banner-link"
                    />
                </div>

                <ToggleInput
                    label="Status"
                    name="status"
                    checked={fieldValues.status}
                    onChange={handleSwitchChange}
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--ui-border)]">
                    <Button
                        label="Cancel"
                        onClick={onClose}
                        color="var(--color-secondary, #6B7280)"
                        hoverColor="var(--color-secondary-hover, #4B5563)"
                    />
                    <Button
                        label={editData ? "Update Slider" : "Save Slider"}
                        onClick={handleSubmitForm}
                        color="var(--color-primary)"
                        hoverColor="var(--color-primary-hover)"
                        isLoading={isLoading}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default HeroSliderForm;
