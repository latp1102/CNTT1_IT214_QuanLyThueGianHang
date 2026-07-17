import { useState } from "react";
import { Form, Input, Button, Progress } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { LockOutlined, CheckCircleOutlined, CloseCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import axiosClient from "../../apis/axiosClient";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "≥ 6 ký tự", pass: password.length >= 6 },
    { label: "Có chữ hoa", pass: /[A-Z]/.test(password) },
    { label: "Có số", pass: /\d/.test(password) },
    { label: "Có ký tự đặc biệt", pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const pct = (score / 4) * 100;
  const color = pct < 50 ? "#ef4444" : pct < 75 ? "#f59e0b" : "#10b981";

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

export default function ResetPassword() {
  const message = useMessage();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { mode } = useSelector((state: RootState) => state.theme);
  const isDark = mode === "dark";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "var(--border)";
  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: "var(--text)", height: 48, borderRadius: 12, transition: "all 0.3s" };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 };

  const onFinish = async (values: any) => {
    if (!token) {
      return message.error("Mã xác thực đặt lại mật khẩu không hợp lệ hoặc bị thiếu!");
    }
    if (values.password !== values.confirmPassword) {
      return message.error("Mật khẩu xác nhận không trùng khớp!");
    }
    setLoading(true);
    try {
      await axiosClient.post("/auth/reset-password", { token, newPassword: values.password });
      message.success({ content: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.", duration: 3, style: { marginTop: 24 } });
      navigate("/login");
    } catch (error: any) {
      message.error(error.message || "Liên kết đặt lại mật khẩu đã hết hạn hoặc không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        Thiết lập mật khẩu mới cho tài khoản của bạn.
      </p>
      <Form name="reset_password_form" onFinish={onFinish} size="large" layout="vertical" requiredMark={false}>
        <Form.Item
          name="password"
          label={<span style={labelStyle}>Mật khẩu mới</span>}
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới!" },
            { min: 6, message: "Mật khẩu phải tối thiểu 6 ký tự!" }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />}
            placeholder="Mật khẩu mới"
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
            { required: true, message: "Vui lòng xác nhận mật khẩu mới!" },
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
            placeholder="Nhập lại mật khẩu mới"
            variant="filled"
            style={inputStyle}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="gradient-btn"
            style={{ height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12 }}
          >
            Đặt lại mật khẩu
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        <Link to="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
          <ArrowLeftOutlined style={{ marginRight: 4 }} /> Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
