import { useCallback, useRef } from "react";

export function useTypewriter() {
  // 현재 실행 중인 애니메이션의 취소 함수 (BUG 5)
  const cancelRef = useRef<(() => void) | null>(null);

  const typeText = useCallback(async (
    text: string,
    onUpdate: (partial: string) => void,
  ) => {
    // 이전 애니메이션이 있으면 취소
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }

    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    let displayed = "";
    for (let i = 0; i < text.length; i++) {
      if (cancelled) break;
      displayed += text[i];
      onUpdate(displayed);
      await new Promise((r) => setTimeout(r, 11 + Math.random() * 9));
    }

    // 취소되지 않았으면 완료 후 정리
    if (!cancelled) {
      cancelRef.current = null;
    }
  }, []);

  const cancelTypewriter = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
  }, []);

  return { typeText, cancelTypewriter };
}
