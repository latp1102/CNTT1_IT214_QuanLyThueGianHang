import { useState, useRef } from "react";
import { Card, Row, Col, Avatar, Typography, Form, Input, Button, Divider, Tag } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { UserOutlined, LockOutlined, CameraOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import axiosClient from "../../apis/axiosClient";
import { loadFaceModels, detectFace, performLivenessCheck, sleep } from "../../utils/faceAuth";
import type { LivenessDirection } from "../../utils/faceAuth";
import FaceCameraModal from "../../components/FaceCameraModal";

const { Title, Text } = Typography;

export default function Profile() {
  const message = useMessage();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const abortRef = useRef<AbortController | null>(null);

  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState("");
  const [modalDirection, setModalDirection] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalError, setModalError] = useState("");

  if (!user) return null;

  const handlePasswordChange = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      return message.error("Mật khẩu xác nhận không trùng khớp!");
    }
    setLoading(true);
    try {
      await axiosClient.post("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      message.success("Đổi mật khẩu tài khoản thành công!");
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || "Mật khẩu hiện tại nhập không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceEnrollReady = async (videoEl: HTMLVideoElement) => {
    setModalPhase("loading");
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
    await axiosClient.post("/auth/face/save-facial-id", { faceDescriptor: descriptor });

    setModalSuccess("Đăng ký khuôn mặt thành công!");
    setTimeout(() => setFaceModalOpen(false), 1500);
  };

  const handleFaceModalCancel = () => {
    abortRef.current?.abort();
    setFaceModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card className="glass-panel" variant="borderless" style={{ textAlign: "center", padding: "16px 0" }}>
            <Avatar size={100} src={user.avatar || undefined} icon={!user.avatar && <UserOutlined />} style={{ border: "3px solid var(--primary-color)", marginBottom: "16px" }} />
            <Title level={3} style={{ margin: "0 0 8px 0" }}>{user.username}</Title>
            <Text type="secondary">{user.email}</Text>

            <Divider style={{ margin: "16px 0" }} />

            <div style={{ textAlign: "left", padding: "0 16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <strong>Vai trò của bạn:</strong>
                <div style={{ marginTop: "6px" }}>
                  {user.roles.map((r: string, idx: number) => (
                    <Tag color="purple" key={idx} style={{ textTransform: "uppercase" }}>{r}</Tag>
                  ))}
                </div>
              </div>

              <div>
                <strong>Quyền hạn trong hệ thống:</strong>
                <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {user.permissions.length > 0 ? (
                    user.permissions.map((p: string, idx: number) => (
                      <Tag color="cyan" key={idx} style={{ fontSize: "11px" }}>{p}</Tag>
                    ))
                  ) : (
                    <Tag color="default">Full Admin Access</Tag>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title={<span><CameraOutlined /> Nhận diện khuôn mặt</span>} className="glass-panel" variant="borderless" style={{ marginBottom: 24 }}>
            <Text type="secondary">
              Đăng ký khuôn mặt để đăng nhập nhanh bằng camera. Hệ thống sẽ yêu cầu bạn
              quay đầu sang trái, phải, lên, xuống để xác thực.
            </Text>
            <Divider style={{ margin: "16px 0" }} />
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={() => {
                setModalPhase("");
                setModalDirection("");
                setModalSuccess("");
                setModalError("");
                setFaceModalOpen(true);
              }}
              style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "none", fontWeight: "bold" }}
            >
              Đăng ký khuôn mặt
            </Button>
          </Card>

          <FaceCameraModal
            open={faceModalOpen}
            title="Đăng ký khuôn mặt"
            phase={modalPhase}
            direction={modalDirection}
            successMessage={modalSuccess}
            errorMessage={modalError}
            onReady={handleFaceEnrollReady}
            onCancel={handleFaceModalCancel}
          />

          <Card title={<span><LockOutlined /> Đổi mật khẩu đăng nhập</span>} className="glass-panel" variant="borderless">
            <Form form={form} layout="vertical" onFinish={handlePasswordChange} size="large">
              <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại!" }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu hiện tại" />
              </Form.Item>

              <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: "Vui lòng nhập mật khẩu mới!" }, { min: 6, message: "Độ dài mật khẩu tối thiểu 6 ký tự!" }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" />
              </Form.Item>

              <Form.Item name="confirmPassword" label="Xác nhận mật khẩu mới" rules={[{ required: true, message: "Vui lòng xác nhận lại mật khẩu mới!" }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
              </Form.Item>

              <Form.Item style={{ margin: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} style={{ background: "var(--primary-color)", borderColor: "var(--primary-color)", fontWeight: "bold" }}>
                  Đổi mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
