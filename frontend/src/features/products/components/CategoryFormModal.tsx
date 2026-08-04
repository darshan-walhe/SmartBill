import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi, type CategoryRequest } from "../../../api/products";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Toast";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryFormModal({ isOpen, onClose }: CategoryFormModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryRequest>();

  function handleClose() {
    reset();
    onClose();
  }

  const mutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      show("Category created", "success");
      handleClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Category"
      subtitle="Group your products for better organization"
      icon="add_circle"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit((data) => mutation.mutate(data))} isLoading={mutation.isPending}>
            Create Category
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">
            Category Name <span className="text-error">*</span>
          </label>
          <input
            className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md"
            placeholder="e.g. Electronics"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <span className="text-[10px] text-error">{errors.name.message}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Description</label>
          <textarea
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md resize-none"
            placeholder="What kind of products belong here?"
            {...register("description")}
          />
        </div>
      </form>
    </Modal>
  );
}