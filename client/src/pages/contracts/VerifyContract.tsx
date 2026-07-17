import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Descriptions, Tag, Spin, Result, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import axiosClient from "../../apis/axiosClient";

interface ContractData {
  contractCode: string;
  status: string;
  customerName: string;
  boothName: string;
  startDate: string;
  endDate: string;
  deposit: number;
}

export default function VerifyContract() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    axiosClient.get(`/contracts/verify/${code}`)
      .then((res: any) => {
        setContract(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Hợp đồng không tồn tại hoặc mã không hợp lệ.");
        setLoading(false);
      });
  }, [code]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Spin size="large" tip="Đang xác thực hợp đồng..." />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5" }}>
        <Result
          status="error"
          title="Xác thực thất bại"
          subTitle={error}
          extra={
            <Link to="/">
              <Button type="primary">Về trang chủ</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isValid = contract.status === "active";

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: 24 }}>
      <Card style={{ maxWidth: 600, width: "100%", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {isValid ? (
            <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />
          ) : (
            <CloseCircleOutlined style={{ fontSize: 64, color: "#ff4d4f" }} />
          )}
          <h2 style={{ marginTop: 16, marginBottom: 4 }}>
            {isValid ? "HỢP ĐỒNG HỢP LỆ" : "HỢP ĐỒNG KHÔNG CÒN HIỆU LỰC"}
          </h2>
          <Tag color={isValid ? "green" : "red"} style={{ fontSize: 13, padding: "2px 12px" }}>
            {isValid ? "Đang hoạt động" : contract.status === "terminated" ? "Đã thanh lý" : "Hết hạn"}
          </Tag>
        </div>

        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Mã hợp đồng">
            <strong>{contract.contractCode}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Khách thuê">{contract.customerName}</Descriptions.Item>
          <Descriptions.Item label="Gian hàng">{contract.boothName}</Descriptions.Item>
          <Descriptions.Item label="Ngày bắt đầu">{new Date(contract.startDate).toLocaleDateString("vi-VN")}</Descriptions.Item>
          <Descriptions.Item label="Ngày kết thúc">{new Date(contract.endDate).toLocaleDateString("vi-VN")}</Descriptions.Item>
          <Descriptions.Item label="Tiền đặt cọc">{contract.deposit.toLocaleString("vi-VN")} đ</Descriptions.Item>
        </Descriptions>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link to="/">
            <Button type="primary" size="large">Về trang chủ</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
