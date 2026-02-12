import { useCallback } from "react";

export function useTypewriter() {
  const typeText = useCallback(async (
    text: string,
    onUpdate: (partial: string) => void,
  ) => {
    let displayed = "";
    for (let i = 0; i < text.length; i++) {
      displayed += text[i];
      onUpdate(displayed);
      await new Promise((r) => setTimeout(r, 22 + Math.random() * 18));
    }
  }, []);

  return { typeText };
}
