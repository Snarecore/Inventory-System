import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { FaFacebookMessenger } from "react-icons/fa";
import EmptyState from "@/components/empty-state/EmptyState";
import DeleteModal from "@/components/modal/DeleteModal";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";

const initialFieldValues = {
    content: "",
};

const requiredFields: any = [
    { key: "content", value: "message", label: "text" },
    { key: "senderId", value: "senderId" },
    { key: "senderRole", value: "senderRole" },
    { key: "receiverId", value: "receiverId" },
    { key: "receiverRole", value: "receiverRole" },
];

interface VendorDataProps {
    id: string;
    name: string;
    featuredImage: string;
    email: string;
    phone: string;
    role: string;
}

interface VendorTableProps {
    dataList: VendorDataProps[];
    fetchData: () => void;
    isLoading?: boolean;
    isFetching?: boolean;
    pageCount: number;
    currentPageNumber: number;
    handlePagination: (paginationData: { selected: number }) => void;
}

const VendorTable = ({
    dataList,
    fetchData,
    pageCount,
    currentPageNumber,
    handlePagination,
    isLoading,
    isFetching
}: VendorTableProps) => {
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [fieldValues, setFieldValues] = useState(initialFieldValues);
    const [isMessageLoading, setIsMessageLoading] = useState(false);
    const [selectedVendorForMessage, setSelectedVendorForMessage] = useState<VendorDataProps | null>(null);

    const tableHeaders = [
        { key: "sl", label: "Sl" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "action", label: "Action" }
    ];

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedVendorList, setSelectedVendorList] = useState<VendorDataProps | null>(null);

    const openDeleteModal = (data: VendorDataProps) => {
        setSelectedVendorList(data);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setSelectedVendorList(null);
    };

    const handleDelete = async () => {
        alert("successful")
    };

    const closeMessageModal = () => {
        setIsMessageModalOpen(false);
        setFieldValues(initialFieldValues);
        setSelectedVendorForMessage(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFieldValues(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmitMessage = async () => {
        setIsMessageLoading(true);
        alert("successuful")
    };


    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
            <div className="w-full overflow-x-auto relative z-10">
                <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                        <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                            {tableHeaders.map(({ key, label }) => (
                                <th key={key} className={`py-2.5 px-3 text-left ${key === "id" ? "w-10 text-center" : ""}`}>
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {dataList?.length > 0 ? (
                            dataList?.map((data, index) => (
                                <tr
                                    key={data.id}
                                    className="hover:bg-sky-50/40 transition-colors group"
                                >
                                    <td className="py-2.5 px-3 text-center font-normal text-xs text-black">
                                        {index + 1}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.name}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.email}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.phone}
                                    </td>

                                    <td className="py-2 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedVendorForMessage(data);
                                                    setIsMessageModalOpen(true);
                                                }}
                                                className="p-1 rounded text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
                                                title="Message"
                                            >
                                                <FaFacebookMessenger size={14} />
                                            </button>
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
                                <td
                                    colSpan={tableHeaders.length}
                                    className="py-12 text-center italic"
                                >
                                    <EmptyState title="No vendor available" description="Can't find any vendor? Invest more to the developers!" />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedVendorList && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete?"
                    message={`Are you sure you want to delete?`}
                    onClose={closeDeleteModal}
                    onDelete={handleDelete}
                />
            )}
            {/* {pageCount > 1 && (
                <div className="flex justify-center">
                    <Pagination
                        pageCount={pageCount}
                        currentPageNumber={currentPageNumber}
                        handlePagination={handlePagination}
                    />
                </div>
            )} */}

            {
                isMessageModalOpen && (
                    <Modal
                        isOpen={isMessageModalOpen}
                        onClose={closeMessageModal}
                        title={"Message to the vendor"}
                        footerButtons={
                            <>
                                <Button label="Cancel" onClick={closeMessageModal} color="var(--color-secondary)" hoverColor="var(--color-secondary-hover)" />
                                <Button
                                    label="Send"
                                    onClick={handleSubmitMessage}
                                    color="var(--color-primary)"
                                    hoverColor="var(--color-primary-hover)"
                                    isLoading={isMessageLoading}
                                    disabled={isMessageLoading}
                                />
                            </>
                        }
                    >
                        <div>
                            <div>
                                {/* <InputField label="Message" type="text"
                                    name="message"
                                    value={fieldValues.message}
                                    required
                                    onChange={handleChange} /> */}
                                <p>Message <span className="text-red-500 font-bold">*</span></p>
                                <textarea
                                    className="w-full border border-gray-300 rounded-md p-2 mt-1"
                                    name="content"
                                    value={fieldValues.content}
                                    required
                                    rows={4}
                                    placeholder="Type your message..."
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </Modal>
                )
            }
        </div>
    );
};

export default VendorTable;
