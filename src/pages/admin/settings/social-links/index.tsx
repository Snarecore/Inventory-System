import { useState, useEffect } from "react";
import { IoMdAddCircleOutline } from "react-icons/io";
import SocialTable from "./components/SocialTable";
import SocialForm from "./components/SocialForm";
import apiConfig from "@/config/api.json";
import { useAPI } from "@/hooks/useApi";
import { socialLinksQueryKey } from "@/config/query-key";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";

const SocialLinks = () => {
    const dataLimit = 10;
    const [currentPageNumber, setCurrentPageNumber] = useState(1);
    const { usePaginatedQuery } = useAPI();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState<any | null>(null);

    const getSocialLinksApiUrl = () => {
        const apiUrl = `${apiConfig.setting.socialLinksUrl || "social-link"}?page=${currentPageNumber}&limit=${dataLimit}`;
        return apiUrl;
    };

    const handlePagination = (paginationData: { selected: number }) => {
        const selectedPage = paginationData.selected + 1;
        setCurrentPageNumber(selectedPage);
    };

    const {
        data: dataList,
        refetch: fetchData,
        isFetching,
        pageCount,
        isLoading
    } = usePaginatedQuery({
        queryKey: [socialLinksQueryKey, String(currentPageNumber)],
        url: getSocialLinksApiUrl()
    });

    useEffect(() => {
        fetchData();
    }, [currentPageNumber]);

    const openModal = (data?: any) => {
        setEditData(data || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditData(null);
    };

    return (
        <>
            <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between flex-wrap">
                    <PageHeader
                        headerTitle="Social Links"
                        headerDescription="Manage your social links"
                    />
                    <Button
                        label="Add New Social Links"
                        onClick={() => openModal()}
                        color="var(--color-primary)"
                        hoverColor="var(--color-primary-hover)"
                        icon={<IoMdAddCircleOutline size={18} />}
                    />
                </div>
                <div className="grid grid-cols-12 gap-12">
                    <div className="col-span-12">
                        <SocialTable
                            dataList={dataList as any}
                            fetchData={fetchData}
                            isLoading={isLoading}
                            isFetching={isFetching}
                            pageCount={pageCount}
                            currentPageNumber={currentPageNumber}
                            handlePagination={handlePagination}
                            onEdit={openModal}
                        />
                    </div>
                </div>
            </div>
            <SocialForm
                isOpen={isModalOpen}
                onClose={closeModal}
                editData={editData}
                fetchData={fetchData}
            />
        </>
    );
};

export default SocialLinks;