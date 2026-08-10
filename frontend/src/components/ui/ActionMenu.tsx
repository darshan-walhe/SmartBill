import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ActionMenuProps {
    trigger: (props: { onClick: () => void }) => React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
}

export function ActionMenu({ trigger, children, isOpen, onClose }: ActionMenuProps) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!isOpen || !triggerRef.current) return;

        function updatePosition() {
            const rect = triggerRef.current!.getBoundingClientRect();
            // Position below the button, right-aligned to it, clamped to viewport
            const menuWidth = 192; // matches w-48 below
            let left = rect.right - menuWidth;
            if (left < 8) left = 8;
            setCoords({ top: rect.bottom + 4, left });
        }

        updatePosition();
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [isOpen]);

    return (
        <div ref={triggerRef} className="inline-block">
            {trigger({ onClick: onClose })}
            {isOpen && coords &&
                createPortal(
                    <>
                        <div className="fixed inset-0 z-40" onClick={onClose} />
                        <div
                            className="fixed z-50 w-48 rounded-lg border border-outline-variant bg-surface py-1 shadow-lg text-left"
                            style={{ top: coords.top, left: coords.left }}
                        >
                            {children}
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
}