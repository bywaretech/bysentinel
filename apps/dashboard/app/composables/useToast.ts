export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: "default" | "success" | "error";
}

let seq = 0;

export function useToast() {
  const toasts = useState<ToastItem[]>("bs-toasts", () => []);

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function push(
    title: string,
    opts: { description?: string; variant?: ToastItem["variant"]; timeout?: number } = {},
  ) {
    const id = ++seq;
    toasts.value = [
      ...toasts.value,
      { id, title, description: opts.description, variant: opts.variant ?? "default" },
    ];
    if (import.meta.client) {
      window.setTimeout(() => dismiss(id), opts.timeout ?? 4200);
    }
    return id;
  }

  return {
    toasts,
    dismiss,
    toast: (title: string, description?: string) => push(title, { description }),
    success: (title: string, description?: string) =>
      push(title, { description, variant: "success" }),
    error: (title: string, description?: string) =>
      push(title, { description, variant: "error" }),
  };
}
