type OnResult = (text: string) => void;
type OnError = (error: string) => void;

class STTEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private listening = false;
  private onResult: OnResult | null = null;
  private onError: OnError | null = null;

  async startListening(onResult: OnResult, onError: OnError): Promise<void> {
    if (this.listening) return;

    this.onResult = onResult;
    this.onError = onError;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("마이크 접근이 거부되었습니다.");
      return;
    }

    this.chunks = [];
    this.listening = true;

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      this.sendToAPI();
    };

    this.mediaRecorder.start();
  }

  stopListening(): void {
    if (!this.listening || !this.mediaRecorder) return;
    this.listening = false;
    this.mediaRecorder.stop();
    this.releaseStream();
  }

  isListening(): boolean {
    return this.listening;
  }

  private releaseStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  private async sendToAPI(): Promise<void> {
    if (this.chunks.length === 0) {
      this.onError?.("녹음된 오디오가 없습니다.");
      return;
    }

    const blob = new Blob(this.chunks, { type: "audio/webm" });
    this.chunks = [];

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const res = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "STT API error" }));
        this.onError?.(err.error || "음성 인식에 실패했습니다.");
        return;
      }

      const data = await res.json();
      if (data.text) {
        this.onResult?.(data.text);
      } else {
        this.onError?.("음성을 인식하지 못했습니다.");
      }
    } catch {
      this.onError?.("음성 인식 요청에 실패했습니다.");
    }
  }
}

// Singleton
let engine: STTEngine | null = null;

export function getSTTEngine(): STTEngine {
  if (!engine) {
    engine = new STTEngine();
  }
  return engine;
}
