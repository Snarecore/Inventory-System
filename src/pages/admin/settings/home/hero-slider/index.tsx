import { useState, useEffect } from "react";
import { IoMdAddCircleOutline } from "react-icons/io";
import HeroSliderTable, { HeroSliderDataProps } from "./components/HeroSliderTable";
import HeroSliderForm from "./components/HeroSliderForm";
import { useHeroSliderListQuery } from "@/hooks/useHeroSliderQueries";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";

const HeroSlider = () => {
    const dataLimit = 10;
    const [currentPageNumber, setCurrentPageNumber] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState<HeroSliderDataProps | null>(null);

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
    } = useHeroSliderListQuery<HeroSliderDataProps>(currentPageNumber, dataLimit);

    useEffect(() => {
        fetchData();
    }, [currentPageNumber]);

    const openModal = (data?: HeroSliderDataProps) => {
        setEditData(data || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditData(null);
    };

    return (
        <div className="flex flex-col gap-6 p-6 min-h-screen">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <PageHeader
                    headerTitle="Hero Slider"
                    headerDescription="Manage home page hero sliders and banners"
                />
                <Button
                    label="Add New Slider"
                    onClick={() => openModal()}
                    color="var(--color-primary)"
                    hoverColor="var(--color-primary-hover)"
                    icon={<IoMdAddCircleOutline size={18} />}
                />
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    <HeroSliderTable
                        dataList={dataList}
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

            <HeroSliderForm
                isOpen={isModalOpen}
                onClose={closeModal}
                fetchData={fetchData}
                editData={editData}
            />
        </div>
    );
};

export default HeroSlider;
