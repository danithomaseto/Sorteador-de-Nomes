import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParticipantsPanel } from "~/features/participants/ParticipantsPanel";
import { renderWithApp } from "~/test/render";

async function openPaste(user: ReturnType<typeof renderWithApp>["user"]) {
  await user.click(screen.getByRole("button", { name: "Colar lista" }));
  return screen.getByRole("dialog", { name: "Colar lista de participantes" });
}

describe("colar lista", () => {
  it("revisa antes de adicionar e deixa a pessoa decidir sobre repetidos", async () => {
    const { user } = renderWithApp(<ParticipantsPanel />);
    const dialog = await openPaste(user);
    await user.type(
      within(dialog).getByLabelText("Nomes"),
      "Ana Lima{Enter}{Enter}Bruno{Enter}ana lima",
    );
    await user.click(within(dialog).getByRole("button", { name: "Revisar lista" }));

    expect(await within(dialog).findByRole("status")).toHaveTextContent(
      "3 participantes encontrados · 1 linha vazia ignorada",
    );
    expect(within(dialog).getByText(/1 nome aparece mais de uma vez/)).toBeInTheDocument();
    expect(within(dialog).getByText("Repete linha 1")).toBeInTheDocument();
    // Nada entra na lista antes da confirmação.
    expect(screen.getByRole("heading", { name: /Participantes/ })).toHaveTextContent("0");

    // Padrão: manter todos (podem ser pessoas diferentes).
    expect(within(dialog).getByRole("button", { name: "Adicionar 3 participantes" })).toBeEnabled();
    await user.click(within(dialog).getByRole("radio", { name: "Ignorar repetidos" }));
    await user.click(within(dialog).getByRole("button", { name: "Adicionar 2 participantes" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /Participantes/ })).toHaveTextContent("2");
    expect(screen.getByText("2 participantes adicionados.")).toBeInTheDocument();
  });

  it("aponta nomes que já estão na lista", async () => {
    const { user } = renderWithApp(<ParticipantsPanel />);
    await user.type(screen.getByLabelText("Nome do participante"), "Bruno");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await screen.findByText("Bruno");

    const dialog = await openPaste(user);
    await user.type(within(dialog).getByLabelText("Nomes"), "bruno{Enter}Carla");
    await user.click(within(dialog).getByRole("button", { name: "Revisar lista" }));

    expect(await within(dialog).findByText("Já está na lista")).toBeInTheDocument();
    expect(within(dialog).getByText(/1 nome já está na lista/)).toBeInTheDocument();
  });

  it("volta para editar sem perder o texto", async () => {
    const { user } = renderWithApp(<ParticipantsPanel />);
    const dialog = await openPaste(user);
    await user.type(within(dialog).getByLabelText("Nomes"), "Ana{Enter}Bia");
    await user.click(within(dialog).getByRole("button", { name: "Revisar lista" }));
    await user.click(await within(dialog).findByRole("button", { name: "Voltar e editar" }));
    expect(within(dialog).getByLabelText("Nomes")).toHaveValue("Ana\nBia");
  });

  it("pede ao menos um nome", async () => {
    const { user } = renderWithApp(<ParticipantsPanel />);
    const dialog = await openPaste(user);
    await user.click(within(dialog).getByRole("button", { name: "Revisar lista" }));
    expect(within(dialog).getByText("Cole ou digite pelo menos um nome.")).toBeInTheDocument();
  });
});
