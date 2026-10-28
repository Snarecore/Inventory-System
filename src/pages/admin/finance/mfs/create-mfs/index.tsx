import React from "react";
import { useParams } from "react-router-dom";
import MfsForm from "./components/MfsForm";
import { useMfsUserListQuery } from "@/hooks/useMfsQueries";
import { TableSkeleton } from "@/components/common";

export const CreateMfsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { data, isLoading } = useMfsUserListQuery({
    enabled: isEdit,
  });

  const accounts = data?.mfsUsers || [];
  const existing = id ? accounts.find((a) => String(a.id) === String(id)) || null : null;

  if (isEdit && isLoading && !existing) {
    return (
      <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <TableSkeleton columnCount={4} rowCount={4} />
        </div>
      </div>
    );
  }

  return (
    <MfsForm
      key={existing?.id ? String(existing.id) : isEdit ? "loading" : "new"}
      initialData={existing}
    />
  );
};

export default CreateMfsPage;
