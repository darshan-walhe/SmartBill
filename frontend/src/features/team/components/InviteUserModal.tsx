import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { usersApi, type InviteRequest, type InviteResponse } from "../../../api/users";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<InviteResponse | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteRequest>({ defaultValues: { role: "STAFF" } });

  const mutation = useMutation({
    mutationFn: usersApi.invite,
    onSuccess: (response) => {
      setResult(response);
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  function handleClose() {
    setResult(null);
    reset();
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={result ? "Teammate invited" : "Invite Team Member"}
      subtitle={result ? undefined : "They'll get instant access to SmartBill"}
      icon="person_add"
    >
      {result ? (
        <div className="space-y-4">
          <p className="text-sm text-slate">
            <span className="font-medium text-ink">{result.user.name}</span> has been added.
            Share this temporary password with them directly — it's shown only this once and
            can't be retrieved again.
          </p>
          <div className="flex items-center justify-between rounded-md border border-border bg-paper px-3 py-2">
            <span className="font-mono text-sm text-ink">{result.temporaryPassword}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(result.temporaryPassword);
                show("Copied to clipboard", "info");
              }}
              className="text-slate hover:text-ink"
              aria-label="Copy password"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <Input
            label="Name"
            error={errors.name?.message}
            {...register("name", { required: "Name is required" })}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email", { required: "Email is required" })}
          />
          <Input
            label="Mobile"
            error={errors.mobile?.message}
            {...register("mobile", { required: "Mobile is required" })}
          />
          <Select label="Role" {...register("role", { required: true })}>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
            <option value="ACCOUNTANT">Accountant</option>
          </Select>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Send invite
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
