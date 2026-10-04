import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, type ButtonSize, type ButtonVariant } from "~/components/Button";
import { ConfirmDialog } from "~/components/Dialog";
import { useToast } from "~/components/Toast";
import { hasSessionData } from "~/features/session/selectors";
import { defaultDrawName, useSession } from "~/features/session/SessionProvider";

interface NewDrawButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Descarta a sessão atual (lista e histórico) e começa outra. Pede confirmação se houver dados. */
export function NewDrawButton({ variant = "secondary", size = "sm" }: NewDrawButtonProps) {
  const { state, dispatch } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  function startNew() {
    dispatch({ type: "reset", name: defaultDrawName() });
    setConfirming(false);
    toast({ message: "Novo sorteio iniciado. Os dados anteriores foram descartados." });
    void navigate("/sorteio");
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        icon="plus"
        onClick={() => {
          if (hasSessionData(state)) setConfirming(true);
          else startNew();
        }}
      >
        Novo sorteio
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Começar um novo sorteio?"
        description="A lista de participantes e o histórico desta sessão serão descartados. Se precisar de um registro, exporte o resultado antes."
        confirmLabel="Descartar e começar"
        onConfirm={startNew}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </>
  );
}
