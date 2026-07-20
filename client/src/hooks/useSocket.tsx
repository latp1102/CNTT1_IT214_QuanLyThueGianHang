import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { notification } from "antd";
import { CheckCircleOutlined, WarningOutlined, InfoCircleOutlined, ShopOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";

const SOCKET_URL = window.location.origin;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useSelector((state: any) => state.auth);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (socketRef.current?.connected) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token: accessToken }
    });

    socketRef.current.on("connect", () => {
      console.log("[Socket] Connected:", socketRef.current?.id);
    });

    socketRef.current.on("notification", (data: { title: string; content: string; type?: string }) => {
      const icon = data.type === "success" ? <CheckCircleOutlined style={{ color: "#52c41a" }} />
        : data.type === "warning" ? <WarningOutlined style={{ color: "#faad14" }} />
        : <InfoCircleOutlined style={{ color: "#1677ff" }} />;

      notification.open({
        message: data.title,
        description: data.content,
        icon,
        placement: "bottomRight",
        duration: 5
      });
    });

    socketRef.current.on("booth-updated", (data: { boothId: number; status: string }) => {
      const statusText = data.status === "available" ? "Còn trống"
        : data.status === "rented" ? "Đã thuê" : "Bảo trì";
      notification.open({
        message: "Cập nhật gian hàng",
        description: `Gian hàng #${data.boothId} đã chuyển sang trạng thái: ${statusText}`,
        icon: <ShopOutlined style={{ color: "#4f46e5" }} />,
        placement: "bottomRight",
        duration: 4
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, accessToken]);

  return socketRef;
}
