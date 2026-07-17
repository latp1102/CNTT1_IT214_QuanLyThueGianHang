import { useState, useRef } from "react";
import { Form, Input, Button, Checkbox, Divider } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { UserOutlined, LockOutlined, FacebookOutlined, ArrowRightOutlined, CameraOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../../redux/slices/authSlice";
import axiosClient from "../../apis/axiosClient";
import type { RootState } from "../../redux/store";
import { loadFaceModels, detectFace, performLivenessCheck, sleep } from "../../utils/faceAuth";
import type { LivenessDirection } from "../../utils/faceAuth";
import FaceCameraModal from "../../components/FaceCameraModal";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [modalDirection, setModalDirection] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalError, setModalError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { mode } = useSelector((state: RootState) => state.theme);
  const isDark = mode === "dark";
  const message = useMessage();
  const [form] = Form.useForm();
  const abortRef = useRef<AbortController | null>(null);

  const inputStyle = {
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "var(--border)"}`,
    color: "var(--text)",
    height: 48,
    borderRadius: 12,
    transition: "all 0.3s",
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await axiosClient.post("/auth/login", {
        username: values.username,
        password: values.password
      });
      dispatch(setCredentials(res.data));
      message.success({ content: "Đăng nhập thành công!", duration: 2, style: { marginTop: 24 } });
      navigate("/dashboard");
    } catch (error: any) {
      message.error(error.message || "Tên tài khoản hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${API_BASE}/auth/facebook`;
  };

  const handleFaceLoginReady = async (videoEl: HTMLVideoElement) => {
    await loadFaceModels();

    const detection = await detectFace(videoEl);
    if (!detection) {
      setModalError("Không phát hiện khuôn mặt. Vui lòng ngồi trước camera.");
      return;
    }

    abortRef.current = new AbortController();

    await performLivenessCheck(videoEl, (dir: LivenessDirection) => {
      setModalDirection(dir);
    }, abortRef.current.signal);

    setModalDirection("");
    await sleep(800);

    const finalDetection = await detectFace(videoEl);
    if (!finalDetection) {
      setModalError("Mất kết nối khuôn mặt. Vui lòng thử lại.");
      return;
    }

    const descriptor = Array.from(finalDetection.descriptor);
    const res: any = await axiosClient.post("/auth/face/login", { faceDescriptor: descriptor });

    dispatch(setCredentials(res.data));
    setModalSuccess("Đăng nhập bằng khuôn mặt thành công!");
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  const handleFaceModalCancel = () => {
    abortRef.current?.abort();
    setFaceModalOpen(false);
  };

  const API_BASE = "http://localhost:5000/api";

  return (
    <div>
      <Form
        form={form}
        name="login_form"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        size="large"
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label={<span style={labelStyle}>Tên tài khoản</span>}
          rules={[{ required: true, message: "Vui lòng nhập tên tài khoản!" }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />}
            placeholder="Nhập tên tài khoản của bạn"
            variant="filled"
            style={inputStyle}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span style={labelStyle}>Mật khẩu</span>}
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />}
            placeholder="Nhập mật khẩu của bạn"
            variant="filled"
            style={inputStyle}
          />
        </Form.Item>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "-8px 0 20px"
        }}>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox style={{ color: "var(--text-muted)", fontSize: 13 }}>Nhớ mật khẩu</Checkbox>
          </Form.Item>
          <Link to="/forgot-password" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>
            Quên mật khẩu?
          </Link>
        </div>

        <Form.Item style={{ marginBottom: 14 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="gradient-btn"
            style={{ height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12 }}
          >
            Đăng nhập <ArrowRightOutlined style={{ fontSize: 14, marginLeft: 4 }} />
          </Button>
        </Form.Item>
      </Form>

      <Divider plain style={{
        borderColor: "var(--border)",
        color: "var(--text-muted)",
        fontSize: 12,
        margin: "4px 0 16px",
        borderStyle: "dashed",
      }}>
        Hoặc tiếp tục với
      </Divider>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <Button
          icon={
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 4 }}>
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
          }
          onClick={handleGoogleLogin}
          block
          style={{
            height: 46, borderRadius: 12, fontWeight: 600, fontSize: 14,
            background: "#fff",
            border: "1px solid #dadce0",
            color: "#3c4043",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.12)";
            e.currentTarget.style.borderColor = "#d2e3fc";
            e.currentTarget.style.background = "#f8faff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
            e.currentTarget.style.borderColor = "#dadce0";
            e.currentTarget.style.background = "#fff";
          }}
        >
          <span style={{ marginLeft: 4 }}>Đăng nhập với Google</span>
        </Button>
        <Button
          icon={<FacebookOutlined style={{ fontSize: 20, color: "#fff" }} />}
          onClick={handleFacebookLogin}
          block
          style={{
            height: 46, borderRadius: 12, fontWeight: 600, fontSize: 14,
            background: "linear-gradient(135deg, #1877f2, #1664d9)",
            border: "none",
            color: "#fff",
            boxShadow: "0 1px 3px rgba(24,119,242,0.3)",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(24,119,242,0.4)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(24,119,242,0.3)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span style={{ marginLeft: 4 }}>Đăng nhập với Facebook</span>
        </Button>
      </div>

      <Divider plain style={{
        borderColor: "var(--border)",
        color: "var(--text-muted)",
        fontSize: 12,
        margin: "8px 0 16px",
        borderStyle: "dashed",
      }}>
        Phương thức bảo mật
      </Divider>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Button
          icon={<CameraOutlined style={{ fontSize: 18 }} />}
          onClick={() => {
            setModalDirection("");
            setModalSuccess("");
            setModalError("");
            setFaceModalOpen(true);
          }}
          style={{
            flex: 1, height: 44, borderRadius: 12, fontWeight: 600, fontSize: 13,
            background: "linear-gradient(135deg, #059669, #10b981)",
            border: "none",
            color: "#fff",
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(5,150,105,0.45)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(5,150,105,0.3)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Khuôn mặt (AI)
        </Button>
      </div>

      <FaceCameraModal
        open={faceModalOpen}
        title="Đăng nhập bằng khuôn mặt"
        direction={modalDirection}
        successMessage={modalSuccess}
        errorMessage={modalError}
        onReady={handleFaceLoginReady}
        onCancel={handleFaceModalCancel}
      />

      <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Chưa có tài khoản?{" "}
        <Link to="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}
