import { useState } from "react";
import { Form, Input, Button, Steps } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { MailOutlined, KeyOutlined, CheckCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import axiosClient from "../../apis/axiosClient";
type Step = "email" | "code";

export default function ForgotPassword() {
  const message = useMessage();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { mode } = useSelector((state: RootState) => state.theme);
  const isDark = mode === "dark";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "var(--border)";

  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: "var(--text)", height: 48, borderRadius: 12, transition: "all 0.3s" };

  const onSendCode = async (values: any) => {
    setLoading(true);
    try {
      await axiosClient.post("/auth/forgot-password", { email: values.email });
      setEmail(values.email);
      setStep("code");
      message.success({ content: "Đã gửi mã xác thực vào email!", duration: 3, style: { marginTop: 24 } });
    } catch (error: any) {
      message.error(error.message || "Không tìm thấy tài khoản với email này.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await axiosClient.post("/auth/verify-reset-code", {
        email,
        code: values.code
      });
      message.success({ content: "Mã xác thực hợp lệ!" });
      navigate(`/reset-password?token=${res.data.resetToken}`);
    } catch (error: any) {
      message.error(error.message || "Mã xác thực không đúng hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Steps
        current={step === "email" ? 0 : 1}
        size="small"
        style={{ marginBottom: 24 }}
        items={[
          { title: "Email", icon: <MailOutlined />, status: step === "code" ? "finish" : "process" },
          { title: "Xác thực", icon: <KeyOutlined />, status: step === "code" ? "process" : "wait" },
          { title: "Hoàn tất", icon: <CheckCircleOutlined />, status: "wait" },
        ]}
      />

      {step === "email" ? (
        <>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Nhập email đã đăng ký tài khoản. Hệ thống sẽ gửi mã xác thực 6 chữ số để đặt lại mật khẩu.
          </p>
          <Form name="forgot_password_form" onFinish={onSendCode} size="large" layout="vertical" requiredMark={false}>
            <Form.Item
              name="email"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Địa chỉ Email</span>}
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

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="gradient-btn"
                style={{ height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12 }}
              >
                Gửi mã xác thực
              </Button>
            </Form.Item>
          </Form>
        </>
      ) : (
        <>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Mã xác thực 6 chữ số đã gửi đến <strong style={{ color: "var(--text)" }}>{email}</strong>. Nhập mã để tiếp tục.
          </p>
          <Form name="verify_code_form" onFinish={onVerifyCode} size="large" layout="vertical" requiredMark={false}>
            <Form.Item
              name="code"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Mã xác thực</span>}
              rules={[
                { required: true, message: "Vui lòng nhập mã xác thực!" },
                { len: 6, message: "Mã xác thực gồm 6 chữ số!" }
              ]}
            >
              <Input
                placeholder="000000"
                maxLength={6}
                variant="filled"
                style={{
                  ...inputStyle,
                  height: 56,
                  textAlign: "center",
                  fontSize: 28,
                  letterSpacing: 12,
                  fontWeight: 700,
                }}
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
                Xác thực mã
              </Button>
            </Form.Item>
          </Form>
        </>
      )}

      <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
        <Link to="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
          <ArrowLeftOutlined style={{ marginRight: 4 }} /> Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
