import { useEffect, useRef } from "react";
import { useGoogleIdentityScript } from "../hooks/useGoogleIdentityScript";

interface GoogleLoginButtonProps {
  onCredential: (idToken: string) => void;
}

export function GoogleLoginButton({ onCredential }: GoogleLoginButtonProps) {
  const scriptLoaded = useGoogleIdentityScript();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => onCredential(response.credential),
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 296,
      text: "continue_with",
    });
  }, [scriptLoaded, onCredential]);

  if (!scriptLoaded) {
    return (
      <div className="flex h-10 items-center justify-center rounded-md border border-border text-sm text-slate">
        Loading Google sign-in…
      </div>
    );
  }

  return <div ref={buttonRef} />;
}
