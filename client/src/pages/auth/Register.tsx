import { useState } from "react";
import { Form, Input, Button, Progress, Checkbox, Divider } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { UserOutlined, LockOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined, ArrowRightOutlined, FacebookOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import axiosClient from "../../apis/axiosClient";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "≥ 6 ký tự", pass: password.length >= 6 },
    { label: "Có chữ hoa", pass: /[A-Z]/.test(password) },
    { label: "Có chữ thường", pass: /[a-z]/.test(password) },
    { label: "Có số", pass: /\d/.test(password) },
    { label: "Có ký tự đặc biệt", pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const pct = (score / 5) * 100;
  const color = pct < 40 ? "#ef4444" : pct < 80 ? "#f59e0b" : "#10b981";

  return (
    <div style={{ marginTop: 4, marginBottom: 12 }}>
      <Progress percent={pct} showInfo={false} strokeColor={color} size="small" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", marginTop: 5 }}>
        {checks.map((c, i) => (
          <span key={i} style={{
            fontSize: 11, display: "flex", alignItems: "center", gap: 3,
            color: c.pass ? "var(--success)" : "var(--text-muted)",
            transition: "color 0.3s",
          }}>
            {c.pass ? <CheckCircleOutlined style={{ fontSize: 10 }} /> : <CloseCircleOutlined style={{ fontSize: 10 }} />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Register() {
  const message = useMessage();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const { mode } = useSelector((state: RootState) => state.theme);
  const isDark = mode === "dark";

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
    if (!agreed) {
      return message.warning("Vui lòng đồng ý với điều khoản sử dụng!");
    }
    if (values.password !== values.confirmPassword) {
      return message.error("Mật khẩu xác nhận không trùng khớp!");
    }
    setLoading(true);
    try {
      await axiosClient.post("/auth/register", {
        username: values.username,
        email: values.email,
        password: values.password
      });
      message.success({ content: "Đăng ký thành công! Vui lòng đăng nhập.", duration: 3, style: { marginTop: 24 } });
      navigate("/login");
    } catch (error: any) {
      message.error(error.message || "Đăng ký thất bại. Tên tài khoản hoặc email đã tồn tại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Form
        name="register_form"
        onFinish={onFinish}
        size="large"
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label={<span style={labelStyle}>Tên tài khoản</span>}
          rules={[
            { required: true, message: "Vui lòng nhập tên tài khoản!" },
            { min: 3, message: "Tên tài khoản phải tối thiểu 3 ký tự!" },
            { pattern: /^[a-zA-Z0-9_]+$/, message: "Chỉ gồm chữ cái, số và dấu gạch dưới!" }
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />}
            placeholder="Tên tài khoản"
            variant="filled"
            style={inputStyle}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label={<span style={labelStyle}>Địa chỉ Email</span>}
          rules={[
            { required: true, message: "Vui lòng nhập email!" },
            { type: "email", message: "Email không đúng định dạng!" }
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />}
            placeholder="example@email.com"
            variant="filled"
            style={inputStyle}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span style={labelStyle}>Mật khẩu</span>}
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu!" },
            { min: 6, message: "Mật khẩu phải tối thiểu 6 ký tự!" }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />}
            placeholder="Tối thiểu 6 ký tự"
            variant="filled"
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </Form.Item>

        {password && <PasswordStrength password={password} />}

        <Form.Item
          name="confirmPassword"
          label={<span style={labelStyle}>Xác nhận mật khẩu</span>}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
              },
            }),
          ]}
          dependencies={["password"]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />}
            placeholder="Nhập lại mật khẩu"
            variant="filled"
            style={inputStyle}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 4 }}>
          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="terms-checkbox"
            style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}
          >
            Tôi đồng ý với{" "}
            <a href="#" style={{ color: "var(--primary)", fontWeight: 600 }}>Điều khoản dịch vụ</a>{" "}
            và{" "}
            <a href="#" style={{ color: "var(--primary)", fontWeight: 600 }}>Chính sách bảo mật</a>
          </Checkbox>
        </Form.Item>

        <Form.Item style={{ marginTop: 12 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!agreed}
            block
            className="gradient-btn"
            style={{
              height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12,
              opacity: agreed ? 1 : 0.5,
            }}
          >
            Đăng ký <ArrowRightOutlined style={{ fontSize: 14, marginLeft: 4 }} />
          </Button>
        </Form.Item>
      </Form>

      <Divider plain style={{
        borderColor: "var(--border)",
        color: "var(--text-muted)",
        fontSize: 12,
        margin: "8px 0 16px",
        borderStyle: "dashed",
      }}>
        Hoặc đăng ký với
      </Divider>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <Button
          icon={
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 4 }}>
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
          }
          onClick={() => window.location.href = "http://localhost:5000/api/auth/google"}
          style={{
            flex: 1, height: 44, borderRadius: 12, fontWeight: 600, fontSize: 14,
            background: "#fff", border: "1px solid #dadce0", color: "#3c4043",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
          Google
        </Button>
        <Button
          icon={<FacebookOutlined style={{ color: "#fff", fontSize: 18 }} />}
          onClick={() => window.location.href = "http://localhost:5000/api/auth/facebook"}
          style={{
            flex: 1, height: 44, borderRadius: 12, fontWeight: 600, fontSize: 14,
            background: "linear-gradient(135deg, #1877f2, #1664d9)",
            border: "none", color: "#fff",
            boxShadow: "0 1px 3px rgba(24,119,242,0.3)",
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
          Facebook
        </Button>
      </div>

      <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Đã có tài khoản?{" "}
        <Link to="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>Đăng nhập</Link>
      </div>
    </div>
  );
}
