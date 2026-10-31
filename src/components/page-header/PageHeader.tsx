interface PageHeaderProps {
    headerTitle: string;
    headerDescription?: string;
}

const PageHeader = ({
    headerTitle,
    headerDescription
}: PageHeaderProps) => {
    return (
        <div className="flex flex-wrap items-center justify-between">
            <div className="flex flex-col">
                <h1 className="text-lg font-bold text-[var(--primary-color)]">{headerTitle}</h1>
                {headerDescription && <p className="text-sm text-[var(--ui-text)]">{headerDescription}</p>}
            </div>
        </div>
    );
};

export default PageHeader;
