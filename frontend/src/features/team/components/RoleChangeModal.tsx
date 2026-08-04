import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, type RoleUpdateRequest, type TeamMember } from "../../../api/users";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";

interface RoleChangeModalProps {
  member: TeamMember | null;
  onClose: () => void;
}

export function RoleChangeModal({ member, onClose }: RoleChangeModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit } = useForm<RoleUpdateRequest>({
    values: member ? { role: member.role as RoleUpdateRequest["role"] } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (body: RoleUpdateRequest) => usersApi.updateRole(member!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      show("Role updated", "success");
      onClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal isOpen={!!member} onClose={onClose} title={`Change role`} subtitle={member?.name} icon="edit">
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-4">
        <Select label="Role" {...register("role", { required: true })}>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="STAFF">Staff</option>
          <option value="ACCOUNTANT">Accountant</option>
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
