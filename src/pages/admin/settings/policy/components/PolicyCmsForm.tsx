import React, { ChangeEvent, useState } from "react";
import TextEditor from "@/components/form/TextEditor";
import { FormKeyboardNav } from "@/components/common/FormKeyboardNav";

export interface PolicyCmsFormProps {
  initialTitle?: string;
  initialDescription?: string;
  onSave?: (data: { title: string; description: string }) => void | Promise<void>;
  onCancel?: () => void;
}

export const PolicyCmsForm: React.FC<PolicyCmsFormProps> = ({
  initialTitle = "",
  initialDescription = "",
  onSave,
  onCancel,
}) => {
  const [fieldValues, setFieldValues] = useState({
    title: initialTitle,
    description: initialDescription,
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFieldValues((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmitForm = async () => {
    if (onSave) {
      await onSave(fieldValues);
    } else {
      alert("successful");
    }
  };

  return (
    <FormKeyboardNav>
      <div className="bg-[var(--ui-surface)] rounded-lg border border-[var(--ui-border)] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-[14px] font-medium text-[var(--ui-text)] mb-1">
              Page Title<span className="text-[var(--ui-danger)]">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={fieldValues.title}
              onChange={handleChange}
              className="w-full p-2 border border-[var(--ui-border-strong)] rounded-md focus:ring-[var(--color-primary)] focus:outline-none"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 mb-8">
          <TextEditor
            value={fieldValues.description}
            onChange={(value) =>
              setFieldValues((prev) => ({ ...prev, description: value }))
            }
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--ui-text-muted)] border border-[var(--ui-border-strong)] rounded-md hover:bg-[var(--ui-surface-muted)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitForm}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </FormKeyboardNav>
  );
};

export default PolicyCmsForm;
