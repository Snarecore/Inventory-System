const TableSkeleton = () => {
    return (
        <div className="p-6 bg-white rounded-lg border border-gray-200 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-50 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-50 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
            </div>
        </div>
    );
};

export default TableSkeleton;
