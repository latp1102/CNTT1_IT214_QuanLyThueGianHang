import { useState, useEffect } from "react";
import { Row, Col, Card, Table, Select, Typography, Spin } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { BarChartOutlined, StarOutlined, ShopOutlined } from "@ant-design/icons";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import axiosClient from "../../apis/axiosClient";

const { Title, Text } = Typography;
const { Option } = Select;

export default function Reports() {
  const message = useMessage();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [chartData, setChartData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [topBooths, setTopBooths] = useState([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [resChart, resCustomers, resBooths] = await Promise.all([
        axiosClient.get("/reports/revenue", { params: { year, type: reportType } }),
        axiosClient.get("/reports/top-customers", { params: { limit: 5 } }),
        axiosClient.get("/reports/top-booths", { params: { limit: 5 } })
      ]);

      setChartData(resChart.data);
      setTopCustomers(resCustomers.data);
      setTopBooths(resBooths.data);
    } catch (error: any) {
      message.error(error.message || "Không thể tải dữ liệu báo cáo thống kê.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [year, reportType]);

  const customerColumns = [
    {
      title: "Họ và tên đối tác",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: "Doanh nghiệp",
      dataIndex: "company",
      key: "company",
      render: (val: string) => val || <span style={{ color: "var(--text-muted)" }}>Cá nhân</span>
    },
    {
      title: "Tổng đóng góp (đ)",
      dataIndex: "totalPaid",
      key: "totalPaid",
      render: (val: number) => val.toLocaleString("vi-VN")
    }
  ];

  const boothColumns = [
    {
      title: "Tên gian hàng",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: "Vị trí lắp đặt",
      key: "location",
      render: (_: any, record: any) => `Tầng ${record.floor} - Khu ${record.zone}`
    },
    {
      title: "Doanh thu tích lũy (đ)",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      render: (val: number) => val.toLocaleString("vi-VN")
    }
  ];

  return (
    <div className="animate-fade-in">
      <div style={{
        marginBottom: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Báo cáo Doanh thu & Hiệu quả</Title>
          <Text type="secondary">Phân tích dòng tiền thuê gian hàng và mức đóng góp doanh số đối tác</Text>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Select value={year} onChange={setYear} style={{ width: "125px" }}>
            <Option value={2026}>Năm 2026</Option>
            <Option value={2025}>Năm 2025</Option>
            <Option value={2024}>Năm 2024</Option>
          </Select>
          <Select value={reportType} onChange={setReportType} style={{ width: "135px" }}>
            <Option value="monthly">Theo tháng</Option>
            <Option value="quarterly">Theo quý</Option>
            <Option value="yearly">Theo năm</Option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <Spin size="large" tip="Đang tổng hợp báo cáo tài chính..." />
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
            <Col span={24}>
              <Card title={<span><BarChartOutlined /> Biểu đồ phân tích doanh thu</span>} className="glass-panel" variant="borderless">
                <div style={{ height: "350px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={12} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: any) => [`${value.toLocaleString("vi-VN")} đ`, "Tiền thực thu"]} />
                      <Legend />
                      <Bar dataKey="revenue" fill="url(#colorReportRevenue)" name="Doanh thu thực nhận (VND)">
                        <defs>
                          <linearGradient id="colorReportRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.25} />
                          </linearGradient>
                        </defs>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title={<span><StarOutlined style={{ color: "#fadb14" }} /> Top 5 đối tác nộp tiền thuê nhiều nhất</span>} className="glass-panel" variant="borderless">
                <Table
                  columns={customerColumns}
                  dataSource={topCustomers}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title={<span><ShopOutlined style={{ color: "#10b981" }} /> Top 5 gian hàng doanh thu cao nhất</span>} className="glass-panel" variant="borderless">
                <Table
                  columns={boothColumns}
                  dataSource={topBooths}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
