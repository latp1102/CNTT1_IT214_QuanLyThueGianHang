import { useEffect, useRef } from "react";
import { Modal, Typography, Spin, Result } from "antd";

const { Text } = Typography;

interface FaceCameraModalProps {
  open: boolean;
  title: string;
  phase?: string;
  direction?: string;
  successMessage?: string;
  errorMessage?: string;
  onReady: (videoEl: HTMLVideoElement, stream: MediaStream) => Promise<void>;
  onCancel?: () => void;
}

const DIRECTION_ARROWS: Record<string, string> = {
  trái: "←",
  phải: "→",
  lên: "↑",
  xuống: "↓",
};

export default function FaceCameraModal({
  open, title, phase, direction, successMessage, errorMessage, onReady, onCancel,
}: FaceCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      initializedRef.current = false;
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await onReady(videoRef.current!, stream);
    };

    start().catch(() => {});

    return () => { cancelled = true; };
  }, [open]);

  const handleClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    initializedRef.current = false;
    onCancel?.();
  };

  const videoHidden = successMessage || errorMessage;

  return (
    <Modal open={open} title={title} onCancel={handleClose} footer={null} width={520} centered destroyOnHidden>
      <div style={{ textAlign: "center" }}>
        <video
          ref={videoRef}
          style={{
            width: "100%", maxWidth: 480, borderRadius: 12,
            transform: "scaleX(-1)", background: "#000",
            display: videoHidden ? "none" : "block",
          }}
          muted
          playsInline
        />

        {successMessage && <Result status="success" title={successMessage} />}
        {errorMessage && <Result status="error" title="Thất bại" subTitle={errorMessage} />}

        {!successMessage && !errorMessage && (
          <div style={{ marginTop: direction ? 16 : 12 }}>
            {direction && (
              <Text strong style={{ fontSize: 20, display: "block", marginBottom: 4 }}>
                {DIRECTION_ARROWS[direction] || ""}
              </Text>
            )}
            <Text strong style={{ fontSize: direction ? 16 : 14 }}>
              {direction
                ? `Quay mặt sang ${direction}`
                : phase === "loading"
                  ? "Đang tải mô hình nhận diện..."
                  : "Đang xử lý..."
              }
            </Text>
            {!direction && (
              <div style={{ marginTop: 8 }}>
                <Spin />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
