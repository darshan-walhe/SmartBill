import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type BroadcastRequest } from "../../../api/notifications";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BroadcastRequest>();

  function handleClose() {
    reset();
    onClose();
  }

  const mutation = useMutation({
    mutationFn: notificationsApi.broadcast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      show("Announcement broadcast to your company", "success");
      handleClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Broadcast Announcement"
      icon="campaign"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit((data) => mutation.mutate(data))} isLoading={mutation.isPending}>
            Send Broadcast
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Announcement Title</label>
          <input
            className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder="e.g. New GST Updates Available"
            {...register("title", { required: "Title is required" })}
          />
          {errors.title && <span className="text-[10px] text-error">{errors.title.message}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Message Content</label>
          <textarea
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
            placeholder="Type your detailed message here..."
            {...register("message", { required: "Message is required" })}
          />
          {errors.message && <span className="text-[10px] text-error">{errors.message.message}</span>}
        </div>
        <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/50 flex items-start gap-3">
          <Icon name="info" className="text-primary mt-0.5" size={20} />
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            This announcement will be visible to every user in your company immediately.
          </p>
        </div>
      </form>
    </Modal>
  );
}