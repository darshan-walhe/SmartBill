import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type CompanyAdminSummary } from "../../../api/admin";
import type { SubscriptionPlan } from "../../../api/company";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";

interface SubscriptionPlanModalProps {
  company: CompanyAdminSummary | null;
  onClose: () => void;
}

export function SubscriptionPlanModal({ company, onClose }: SubscriptionPlanModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit } = useForm<{ plan: SubscriptionPlan }>({
    values: company ? { plan: company.subscriptionPlan } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) => adminApi.updateSubscriptionPlan(company!.id, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      show("Subscription plan updated", "success");
      onClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal isOpen={!!company} onClose={onClose} title="Change subscription plan" subtitle={company?.name} icon="workspace_premium">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data.plan))}
        className="flex flex-col gap-4"
      >
        <Select label="Subscription plan" {...register("plan", { required: true })}>
          <option value="FREE">Free</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </Select>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
