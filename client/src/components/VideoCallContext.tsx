import { useState, useRef, useCallback, useEffect, createContext, useContext } from "react";
import { Modal, Button, Space, Avatar, Typography, Badge, Tooltip, Popover } from "antd";
import { useMessage } from "../hooks/useMessage";
import { PhoneOutlined, PhoneFilled, CloseOutlined, AudioMutedOutlined, AudioOutlined, VideoCameraOutlined, VideoCameraAddOutlined, MinusOutlined, SwapOutlined, FullscreenOutlined, DesktopOutlined, SmileOutlined, HeartFilled } from "@ant-design/icons";
import { io, type Socket } from "socket.io-client";
import { useSelector } from "react-redux";

const { Text } = Typography;

interface OnlineUser {
  userId: number;
  username: string;
  socketId: string;
}

interface CallState {
  status: "idle" | "calling" | "incoming" | "active";
  peerId: number | null;
  peerName: string;
  peerAvatar: string | null;
}

export interface VideoCallContextType {
  startCall: (userId: number, username: string, avatar?: string | null) => void;
  onlineUsers: OnlineUser[];
}

const VideoCallContext = createContext<VideoCallContextType>({
  startCall: () => {},
  onlineUsers: []
});

export const useVideoCall = () => useContext(VideoCallContext);

const SOCKET_URL = window.location.origin;
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const STICKERS = ["❤️", "😂", "👍", "🎉", "😍", "👏", "🔥", "🚀", "💯", "🎊", "😎", "💪"];

interface FloatingSticker {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

export function VideoCallProvider({ children }: { children: React.ReactNode }) {
  const message = useMessage();
  const { accessToken, user } = useSelector((state: any) => state.auth);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [callState, setCallState] = useState<CallState>({ status: "idle", peerId: null, peerName: "", peerAvatar: null });
  const [minimized, setMinimized] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<any>(null);
  const callStateRef = useRef(callState);
  callStateRef.current = callState;
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [floatingStickers, setFloatingStickers] = useState<FloatingSticker[]>([]);
  const stickerIdRef = useRef(0);

  const cleanupCall = useCallback(() => {
    pendingOfferRef.current = null;
    remoteStreamRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallState({ status: "idle", peerId: null, peerName: "", peerAvatar: null });
    setMinimized(false);
    setAudioMuted(false);
    setVideoOff(false);
    setFacingMode("user");
    setIsScreenSharing(false);
    screenTrackRef.current = null;
    setFloatingStickers([]);
  }, []);

  const handleEndCall = useCallback(() => {
    if (socketRef.current && callStateRef.current.peerId) {
      socketRef.current.emit("video-call:end", { targetId: callStateRef.current.peerId });
    }
    cleanupCall();
  }, [cleanupCall]);

  const handleRejectCall = useCallback(() => {
    if (socketRef.current && callStateRef.current.peerId) {
      socketRef.current.emit("video-call:reject", { callerId: callStateRef.current.peerId });
    }
    cleanupCall();
  }, [cleanupCall]);

  const initiateCallSetup = useCallback(async (targetId: number, offer: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("video-call:ice-candidate", {
            targetId,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit("video-call:answer", { callerId: targetId, answer });
      setCallState((prev) => ({ ...prev, status: "active" }));
    } catch (err) {
      console.error("[VideoCall] Error setting up call:", err);
      message.error("Không thể trả lời cuộc gọi.");
      handleEndCall();
    }
  }, [handleEndCall]);

  const handleAnswerCall = useCallback(() => {
    if (pendingOfferRef.current) {
      const { callerId, offer } = pendingOfferRef.current;
      pendingOfferRef.current = null;
      initiateCallSetup(callerId, offer);
    }
  }, [initiateCallSetup]);

  useEffect(() => {
    if (!accessToken || !user) return;
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token: accessToken }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[VideoCall] Socket connected:", socket.id);
    });

    socket.on("online-users", (users: OnlineUser[]) => {
      setOnlineUsers(users.filter((u) => u.userId !== user.id));
    });

    socket.on("video-call:incoming", (data: { callerId: number; callerName: string; callerAvatar?: string; offer: any }) => {
      if (callStateRef.current.status !== "idle") {
        socket.emit("video-call:reject", { callerId: data.callerId });
        return;
      }
      pendingOfferRef.current = data;
      setCallState({ status: "incoming", peerId: data.callerId, peerName: data.callerName, peerAvatar: data.callerAvatar || null });
    });

    socket.on("video-call:answered", async (data: { answer: any }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallState((prev) => ({ ...prev, status: "active" }));
        } catch (err) {
          console.error("[VideoCall] Error setting remote answer:", err);
        }
      }
    });

    socket.on("video-call:ice-candidate", async (data: { candidate: any }) => {
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("[VideoCall] Error adding ICE candidate:", err);
        }
      }
    });

    socket.on("video-call:ended", () => {
      message.info("Cuộc gọi đã kết thúc.");
      cleanupCall();
    });

    socket.on("video-call:rejected", (data: { fromName: string }) => {
      message.info(`${data.fromName} đã từ chối cuộc gọi.`);
      cleanupCall();
    });

    socket.on("video-call:sticker", (data: { emoji: string }) => {
      const id = ++stickerIdRef.current;
      setFloatingStickers((prev) => [...prev, { id, emoji: data.emoji, x: Math.random() * 60 + 20, y: Math.random() * 30 + 10 }]);
      setTimeout(() => setFloatingStickers((prev) => prev.filter((s) => s.id !== id)), 2500);
    });

    socket.on("video-call:user-offline", () => {
      message.warning("Người dùng hiện không trực tuyến.");
      cleanupCall();
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, user]);

  const startCall = useCallback(async (targetId: number, targetName: string, targetAvatar?: string | null) => {
    if (callStateRef.current.status !== "idle") {
      message.warning("Đang có cuộc gọi khác.");
      return;
    }
    if (!socketRef.current) {
      message.error("Không thể kết nối đến máy chủ.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current!.emit("video-call:ice-candidate", {
            targetId,
            candidate: event.candidate
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setCallState({ status: "calling", peerId: targetId, peerName: targetName, peerAvatar: targetAvatar || null });

      socketRef.current.emit("video-call:offer", { receiverId: targetId, offer });
    } catch (err) {
      console.error("[VideoCall] Error starting call:", err);
      message.error("Không thể truy cập camera hoặc microphone.");
      cleanupCall();
    }
  }, [cleanupCall]);

  const sendSticker = useCallback((emoji: string) => {
    if (!socketRef.current || !callStateRef.current.peerId) return;
    socketRef.current.emit("video-call:sticker", { targetId: callStateRef.current.peerId, emoji });
    const id = ++stickerIdRef.current;
    setFloatingStickers((prev) => [...prev, { id, emoji, x: 40, y: 30 }]);
    setTimeout(() => setFloatingStickers((prev) => prev.filter((s) => s.id !== id)), 2500);
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOff(!videoTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode }, audio: false });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current.addTrack(newVideoTrack);
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newVideoTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setFacingMode(newFacingMode);
    } catch (err) {
      console.error("[VideoCall] Error switching camera:", err);
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;
    if (isScreenSharing) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const newVideoTrack = stream.getVideoTracks()[0];
      if (localStreamRef.current) {
        const oldScreenTrack = screenTrackRef.current;
        if (oldScreenTrack) oldScreenTrack.stop();
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
      }
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newVideoTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      screenTrackRef.current = null;
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => { if (isScreenSharing) toggleScreenShare(); };
        screenTrackRef.current = screenTrack;
        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
          localStreamRef.current.addTrack(screenTrack);
        }
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setIsScreenSharing(true);
      } catch (err) {
        console.error("[VideoCall] Screen share cancelled or failed:", err);
      }
    }
  };

  const toggleFullscreen = () => {
    const el = remoteVideoRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [callState.status, minimized]);

  return (
    <VideoCallContext.Provider value={{ startCall, onlineUsers }}>
      <style>{`
        @keyframes stickerFloat {
          0% { opacity: 1; transform: translateY(0) scale(0.5); }
          15% { opacity: 1; transform: translateY(-10px) scale(1.2); }
          30% { opacity: 1; transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-120px) scale(0.8); }
        }
      `}</style>
      {children}

      {callState.status === "incoming" && (
        <Modal
          open
          closable={false}
          footer={null}
          width={360}
          centered
          styles={{ body: { textAlign: "center", padding: "32px 24px" } }}
        >
          <Avatar size={80} src={callState.peerAvatar || undefined} icon={!callState.peerAvatar && <PhoneOutlined />} style={{ border: "3px solid var(--primary)", marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{callState.peerName}</div>
          <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>Đang gọi video...</Text>
          <Space size="large">
            <Tooltip title="Từ chối">
              <Button shape="circle" size="large" danger icon={<CloseOutlined />} onClick={handleRejectCall} style={{ width: 56, height: 56 }} />
            </Tooltip>
            <Tooltip title="Trả lời">
              <Button shape="circle" size="large" type="primary" icon={<PhoneFilled />} onClick={handleAnswerCall} style={{ width: 56, height: 56, background: "#52c41a", borderColor: "#52c41a" }} />
            </Tooltip>
          </Space>
        </Modal>
      )}

      {(callState.status === "calling" || callState.status === "active") && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: minimized ? 280 : 380,
          background: "var(--bg-card)",
          borderRadius: 16,
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          overflow: "hidden",
          transition: "all 0.3s"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "var(--primary-gradient)",
            color: "#fff"
          }}>
            <Space>
              <Badge status={callState.status === "active" ? "success" : "processing"} />
              <Text style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
                {callState.status === "calling" ? `Đang gọi ${callState.peerName}...` : `Đang trò chuyện với ${callState.peerName}`}
              </Text>
            </Space>
            <Space>
              <Button type="text" icon={<MinusOutlined />} onClick={() => setMinimized(!minimized)} style={{ color: "#fff", fontSize: 14 }} />
              <Button type="text" icon={<CloseOutlined />} onClick={handleEndCall} style={{ color: "#fff", fontSize: 14 }} />
            </Space>
          </div>

          {!minimized && (
            <div style={{ padding: 12, position: "relative" }}>
              <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden", aspectRatio: "4/3" }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {floatingStickers.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      position: "absolute",
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      fontSize: 40,
                      pointerEvents: "none",
                      animation: "stickerFloat 2.5s ease-out forwards",
                      zIndex: 10,
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                    }}
                  >
                    {s.emoji}
                  </div>
                ))}
                <div style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  width: 100,
                  height: 75,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.5)",
                  background: "#222"
                }}>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <Tooltip title={audioMuted ? "Bật mic" : "Tắt mic"}>
                  <Button shape="circle" icon={audioMuted ? <AudioMutedOutlined /> : <AudioOutlined />} onClick={toggleMute}
                    style={{ width: 44, height: 44, background: audioMuted ? "#ef4444" : "var(--bg-secondary)", color: audioMuted ? "#fff" : "var(--text)", border: "none" }} />
                </Tooltip>
                <Tooltip title={videoOff ? "Bật camera" : "Tắt camera"}>
                  <Button shape="circle" icon={videoOff ? <VideoCameraAddOutlined /> : <VideoCameraOutlined />} onClick={toggleVideo}
                    style={{ width: 44, height: 44, background: videoOff ? "#ef4444" : "var(--bg-secondary)", color: videoOff ? "#fff" : "var(--text)", border: "none" }} />
                </Tooltip>
                <Tooltip title="Chuyển đổi camera">
                  <Button shape="circle" icon={<SwapOutlined />} onClick={switchCamera}
                    style={{ width: 44, height: 44, background: "var(--bg-secondary)", color: "var(--text)", border: "none" }} />
                </Tooltip>
                <Tooltip title={isScreenSharing ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"}>
                  <Button shape="circle" icon={<DesktopOutlined />} onClick={toggleScreenShare}
                    style={{ width: 44, height: 44, background: isScreenSharing ? "#52c41a" : "var(--bg-secondary)", color: isScreenSharing ? "#fff" : "var(--text)", border: "none" }} />
                </Tooltip>
                <Tooltip title="Toàn màn hình">
                  <Button shape="circle" icon={<FullscreenOutlined />} onClick={toggleFullscreen}
                    style={{ width: 44, height: 44, background: "var(--bg-secondary)", color: "var(--text)", border: "none" }} />
                </Tooltip>
                <Popover
                  content={
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, width: 208 }}>
                      {STICKERS.map((emoji) => (
                        <Button
                          key={emoji}
                          type="text"
                          style={{ fontSize: 24, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => { sendSticker(emoji); setStickerPickerOpen(false); }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  }
                  open={stickerPickerOpen}
                  onOpenChange={setStickerPickerOpen}
                  trigger="click"
                >
                  <Tooltip title="Gửi sticker">
                    <Button shape="circle" icon={<SmileOutlined />}
                      style={{ width: 44, height: 44, background: "var(--bg-secondary)", color: "var(--text)", border: "none" }} />
                  </Tooltip>
                </Popover>
                <Tooltip title="Thả tim">
                  <Button shape="circle" icon={<HeartFilled />} onClick={() => sendSticker("❤️")}
                    style={{ width: 44, height: 44, background: "#ff4d4f", color: "#fff", border: "none" }} />
                </Tooltip>
                <Tooltip title="Kết thúc cuộc gọi">
                  <Button shape="circle" danger icon={<PhoneFilled />} onClick={handleEndCall}
                    style={{ width: 44, height: 44, background: "#ef4444", color: "#fff", border: "none", transform: "rotate(135deg)" }} />
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      )}
    </VideoCallContext.Provider>
  );
}
