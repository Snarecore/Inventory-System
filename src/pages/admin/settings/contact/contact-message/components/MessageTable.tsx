import EmptyState from "@/components/empty-state/EmptyState";
import DeleteModal from "@/components/modal/DeleteModal";
import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";

interface ContactMessageDataProps {
    id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
}

interface ContactMessageTableProps {
    dataList: ContactMessageDataProps[];
    fetchData: () => void;
    isLoading?: boolean;
    isFetching?: boolean;
}

const MessageTable = ({ dataList, fetchData, isLoading, isFetching }: ContactMessageTableProps) => {

    const tableHeaders = [
        { key: "sl", label: "Sl" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "message", label: "Message" },
        { key: "action", label: "Action" }
    ];

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedContactMessage, setSelectedContactMessage] = useState<ContactMessageDataProps | null>(null);

    const openDeleteModal = (data: ContactMessageDataProps) => {
        setSelectedContactMessage(data);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setSelectedContactMessage(null);
    };

    const handleDelete = async () => {
        if (!selectedContactMessage) return;
        alert("successful")
    };


    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
            <div className="w-full overflow-x-auto relative z-10">
                <table className="w-full text-left border-collapse min-w-[1000px] text-xs">
                    <thead>
                        <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                            {tableHeaders.map(({ key, label }) => (
                                <th key={key} className={`py-2.5 px-3 text-left ${key === "id" ? "w-10 text-center" : ""}`}>{label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {dataList?.length > 0 ? (
                            dataList?.map((data, index) => (
                                <tr key={data.id} className="hover:bg-sky-50/40 transition-colors group">
                                    <td className="py-2.5 px-3 text-center font-normal text-xs text-black">{index + 1}</td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.name}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.email}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.phone}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.message}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openDeleteModal(data)}
                                                className="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={tableHeaders.length} className="py-12 text-center italic">
                                    <EmptyState title="No contact messages available" description="Incoming messages will show up here." />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedContactMessage && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Contact Message"
                    message={`Are you sure you want to delete contact message?`}
                    onClose={closeDeleteModal}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default MessageTable;
