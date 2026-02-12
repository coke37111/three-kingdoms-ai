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
      await new Promise((r) => setTimeout(r, 11 + Math.random() * 9));
    }
  }, []);

  return { typeText };
}
