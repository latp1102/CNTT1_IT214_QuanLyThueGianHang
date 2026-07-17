import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../redux/slices/authSlice";
import { Spin } from "antd";
import { useMessage } from "../../hooks/useMessage";

export default function OAuthCallback() {
  const message = useMessage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const userStr = searchParams.get("user");
    const error = searchParams.get("error");

    if (error) {
      message.error("Đăng nhập bằng mạng xã hội thất bại. Vui lòng thử lại.");
      navigate("/login");
      return;
    }

    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        dispatch(setCredentials({ user, accessToken, refreshToken }));
        message.success("Đăng nhập thành công!");
        navigate("/dashboard");
      } catch {
        message.error("Đăng nhập không hợp lệ.");
        navigate("/login");
      }
    } else {
      message.error("Thông tin đăng nhập không hợp lệ.");
      navigate("/login");
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      color: "#ffffff"
    }}>
      <div style={{ textAlign: "center" }}>
        <Spin size="large" />
        <p style={{ marginTop: "16px", color: "#94a3b8" }}>Đang xử lý đăng nhập...</p>
      </div>
    </div>
  );
}
