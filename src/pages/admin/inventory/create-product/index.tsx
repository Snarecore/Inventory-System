import Button from "@/components/button/Button";
import PageHeader from "@/components/page-header/PageHeader";
import { FaArrowLeft } from "react-icons/fa";
import CreateProductForm from "./components/ProductForm";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";

const CreateProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const isEditMode = Boolean(id || searchParams.get("id") || searchParams.get("edit") || (location.state as any)?.editData);

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-6 sm:py-4">
      <div className="flex items-center gap-4 justify-between flex-wrap">
        <PageHeader
          headerTitle={isEditMode ? "Edit Product" : "Create Product"}
          headerDescription={isEditMode ? "Update existing product details" : "Create a new inventory product"}
        />
        <Button
          label="Back to Products"
          onClick={() => {navigate("/admin/products")}}
          color="#009FE3"
          hoverColor="#0085be"
          icon={<FaArrowLeft />}
        />
      </div>

      <div>
        <CreateProductForm />
      </div>
    </div>
  );
};

export default CreateProduct;
