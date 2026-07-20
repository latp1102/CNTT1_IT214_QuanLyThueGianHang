import { useEffect, useState, useRef } from "react";
import { Row, Col, Card, Badge, Typography, Space, Tag, Alert, Modal, Descriptions, Tooltip } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { DollarOutlined, ShopOutlined, TeamOutlined, FileTextOutlined, RiseOutlined, WarningOutlined, ClockCircleOutlined, EnvironmentOutlined, AppstoreOutlined, EyeOutlined } from "@ant-design/icons";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { io, type Socket } from "socket.io-client";
import { Link } from "react-router-dom";
import axiosClient from "../../apis/axiosClient";

const { Text } = Typography;

const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500&auto=format&fit=crop",
];

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  available: { color: "#22c55e", label: "Còn trống" },
  rented: { color: "#3b82f6", label: "Đang thuê" },
  maintenance: { color: "#f59e0b", label: "Bảo trì" },
};

const StatCardSkeleton = () => (
  <Card className="glass-card" variant="borderless" style={{ padding: 4 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: 100, height: 12, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 140, height: 24 }} />
      </div>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
    </div>
  </Card>
);

const ChartSkeleton = () => (
  <Card className="glass-panel" variant="borderless">
    <div className="skeleton" style={{ width: 200, height: 16, marginBottom: 16 }} />
    <div className="skeleton" style={{ width: "100%", height: 260 }} />
  </Card>
);

const StatCard = ({ title, value, formatter, icon, color, index }: any) => (
  <Col xs={24} sm={12} lg={6}>
    <Card className="glass-card animate-fade-in" style={{ padding: 4 }} variant="borderless">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {title}
          </Text>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--text)", lineHeight: 1.2 }}>
            {formatter(value)}
          </div>
          <div style={{ marginTop: 4 }}>
            <Tag color={index < 2 ? "green" : "blue"} style={{ fontSize: 11, borderRadius: 6 }}>
              <RiseOutlined /> +12.5%
            </Tag>
          </div>
        </div>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${color}22`,
        }}>
          <span style={{ fontSize: 22, color }}>{icon}</span>
        </div>
      </div>
    </Card>
  </Col>
);

function BoothCard({ booth, onClick }: { booth: any; onClick: () => void }) {
  const status = STATUS_MAP[booth.status] || { color: "#94a3b8", label: booth.status };
  const firstImg = booth.images ? booth.images.split(",")[0] : null;
  const fallbackImg = FALLBACK_IMAGES[(booth.id || 0) % FALLBACK_IMAGES.length];
  const [imgSrc, setImgSrc] = useState(firstImg || fallbackImg);
  const [imgError, setImgError] = useState(false);

  const handleImgError = () => {
    if (imgSrc === firstImg && firstImg) {
      setImgSrc(fallbackImg);
    } else {
      setImgError(true);
    }
  };

  return (
    <div className="booth-card animate-fade-in" onClick={onClick}>
      <div className="booth-card-image">
        {imgError ? (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            fontSize: 48, color: "rgba(255,255,255,0.5)",
          }}>
            <ShopOutlined />
          </div>
        ) : (
          <img src={imgSrc} alt={booth.name} onError={handleImgError} />
        )}
        <Tag className="booth-card-status" color={status.color}>
          {status.label}
        </Tag>
      </div>
      <div className="booth-card-body">
        <h4 className="booth-card-name">{booth.name}</h4>
        <div className="booth-card-info">
          <span className="booth-card-info-item">
            <EnvironmentOutlined /> Tầng {booth.floor} - Khu {booth.zone}
          </span>
          <span className="booth-card-info-item">
            <AppstoreOutlined /> {booth.area} m²
          </span>
        </div>
        <div className="booth-card-price">
          <div>
            <div className="booth-card-price-value">{booth.price.toLocaleString("vi-VN")} đ</div>
            <div className="booth-card-price-label">/ tháng</div>
          </div>
          <Tooltip title="Xem chi tiết">
            <EyeOutlined style={{ color: "var(--text-muted)", fontSize: 16, cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function BoothGalleryImage({ url, name, index }: { url: string; name: string; index: number }) {
  const fallbackUrl = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const [imgSrc, setImgSrc] = useState(url);
  const [error, setError] = useState(false);

  const handleError = () => {
    if (imgSrc !== fallbackUrl && url) {
      setImgSrc(fallbackUrl);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div style={{
        height: 200, minWidth: 260, borderRadius: 12,
        background: "linear-gradient(135deg, #4f46e5, #6366f1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border)", flexShrink: 0,
      }}>
        <ShopOutlined style={{ fontSize: 48, color: "rgba(255,255,255,0.4)" }} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`${name} - ${index + 1}`}
      onError={handleError}
      style={{ height: 200, borderRadius: 12, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
    />
  );
}

export default function Dashboard() {
  const message = useMessage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [booths, setBooths] = useState<any[]>([]);
  const [boothsLoading, setBoothsLoading] = useState(true);
  const [selectedBooth, setSelectedBooth] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const refreshData = async () => {
    try {
      const res: any = await axiosClient.get("/reports/dashboard-stats");
      setData(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res: any = await axiosClient.get("/reports/dashboard-stats");
        setData(res.data);
      } catch (error: any) {
        message.error(error.message || "Lỗi khi tải dữ liệu thống kê.");
      } finally {
        setLoading(false);
      }
    };
    const fetchBooths = async () => {
      try {
        const res: any = await axiosClient.get("/booths", { params: { limit: 10 } });
        setBooths(res.data.items || []);
      } catch { /* ignore */ }
      setBoothsLoading(false);
    };
    fetchStats();
    fetchBooths();

    const socket = io(window.location.origin, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("notification", () => refreshData());
    socket.on("booth-updated", () => {
      axiosClient.get("/booths", { params: { limit: 10 } }).then((res: any) => {
        setBooths(res.data.items || []);
      }).catch(() => {});
      refreshData();
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleViewBooth = (booth: any) => {
    setSelectedBooth(booth);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="page-header">
          <div className="skeleton" style={{ width: 240, height: 24, marginBottom: 4 }} />
          <div className="skeleton" style={{ width: 360, height: 14 }} />
        </div>
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={24} sm={12} lg={6} key={i}><StatCardSkeleton /></Col>
          ))}
        </Row>
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={16}><ChartSkeleton /></Col>
          <Col xs={24} lg={8}><ChartSkeleton /></Col>
        </Row>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Card className="glass-panel" variant="borderless" style={{ padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h3 style={{ color: "var(--error)", margin: "0 0 8px" }}>Không thể tải thông tin tổng quan</h3>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Tài khoản không có quyền truy cập hoặc kết nối dữ liệu bị gián đoạn.</p>
        </Card>
      </div>
    );
  }

  const { stats, boothStatus, revenueChart, notifications, alerts } = data;

  const statCards = [
    { title: "Tổng doanh thu", value: stats.totalRevenue, formatter: (v: number) => `${v.toLocaleString("vi-VN")} đ`, icon: <DollarOutlined />, color: "#4f46e5" },
    { title: "Gian hàng", value: stats.totalBooths, formatter: (v: number) => `${v} gian`, icon: <ShopOutlined />, color: "#0ea5e9" },
    { title: "Khách thuê", value: stats.totalCustomers, formatter: (v: number) => `${v} khách`, icon: <TeamOutlined />, color: "#10b981" },
    { title: "Hợp đồng", value: stats.totalContracts, formatter: (v: number) => `${v} hợp đồng`, icon: <FileTextOutlined />, color: "#f59e0b" },
  ];

  const hasAlerts = alerts?.expiringContracts?.length > 0 || alerts?.overdueInvoices?.length > 0;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h2 className="section-title">Tổng quan hệ thống</h2>
        <p>Theo dõi hoạt động cho thuê, doanh thu và trạng thái mặt bằng</p>
      </div>

      {/* Smart Alerts */}
      {hasAlerts && (
        <div style={{ marginBottom: 24 }}>
          {alerts.expiringContracts?.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<ClockCircleOutlined />}
              title={<strong>Hợp đồng sắp hết hạn</strong>}
              description={
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                  {alerts.expiringContracts.map((c: any) => (
                    <li key={c.id}>
                      <strong>{c.contractCode}</strong> - {c.customerName} ({c.boothName}) - Hết hạn: {new Date(c.endDate).toLocaleDateString("vi-VN")}
                    </li>
                  ))}
                </ul>
              }
              style={{ borderRadius: 12, marginBottom: 8 }}
            />
          )}
          {alerts.overdueInvoices?.length > 0 && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              title={<strong>Hóa đơn quá hạn</strong>}
              description={
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                  {alerts.overdueInvoices.map((i: any) => (
                    <li key={i.id}>
                      <strong>{i.invoiceCode}</strong> - {i.contractCode} - {i.amount.toLocaleString("vi-VN")} đ - Quá hạn: {new Date(i.dueDate).toLocaleDateString("vi-VN")}
                    </li>
                  ))}
                </ul>
              }
              style={{ borderRadius: 12 }}
            />
          )}
        </div>
      )}

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {statCards.map((card, idx) => (
          <StatCard key={idx} {...card} index={idx} />
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24, alignItems: "stretch" }}>
        <Col xs={24} lg={16}>
          <Card
            title={<span className="gradient-text">Doanh thu & Dự đoán</span>}
            className="glass-panel"
            variant="borderless"
            style={{ height: "100%" }}
            extra={<Tag color="blue" style={{ borderRadius: 8, fontSize: 12 }}>Năm 2026</Tag>}
          >
            <div style={{ height: 300, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.15} />
                    </linearGradient>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <ReTooltip
                    formatter={(value: any) => [`${value.toLocaleString("vi-VN")} đ`, "Doanh thu"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
                  />
                  <Bar dataKey={(entry: any) => entry.predicted ? 0 : entry.revenue} name="Thực tế" fill="url(#revGrad)" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar dataKey={(entry: any) => entry.predicted ? entry.revenue : 0} name="Dự đoán" fill="url(#predGrad)" radius={[6, 6, 0, 0]} maxBarSize={30} opacity={0.7} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Trạng thái gian hàng" className="glass-panel" variant="borderless" style={{ height: "100%" }}>
            <div style={{ height: 220, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={boothStatus}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {boothStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: any) => [`${v} gian`]} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, padding: "0 4px" }}>
              {boothStatus.map((entry: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: "var(--text-secondary)" }}>{entry.name}</span>
                  </div>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Booth Gallery Section */}
      {!boothsLoading && booths.length > 0 && (
        <div className="booth-grid-section">
          <div className="section-header">
            <div className="section-header-left">
              <div className="section-header-icon" style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
                <ShopOutlined style={{ color: "#fff", fontSize: 16 }} />
              </div>
              <div>
                <h3 className="section-header-title">Gian hàng nổi bật</h3>
                <p className="section-header-sub">Khám phá các gian hàng đang cho thuê</p>
              </div>
            </div>
            <Link to="/booths">
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                padding: "4px 14px",
                borderRadius: 20,
                cursor: "pointer",
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                color: "#fff",
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(79,70,229,0.35)",
                transition: "opacity 0.2s",
              }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                Xem tất cả →
              </span>
            </Link>
          </div>

          <div className="booth-grid-scroll">
            {booths.map((booth: any) => (
              <BoothCard key={booth.id} booth={booth} onClick={() => handleViewBooth(booth)} />
            ))}
          </div>
        </div>
      )}

      {/* Booth cards in grid for larger screens */}
      {!boothsLoading && booths.length > 0 && (
        <div className="booth-grid-section" style={{ marginTop: 12 }}>
          <div className="section-header">
            <div className="section-header-left">
              <div className="section-header-icon" style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)" }}>
                <AppstoreOutlined style={{ color: "#fff", fontSize: 16 }} />
              </div>
              <div>
                <h3 className="section-header-title">Danh sách gian hàng</h3>
                <p className="section-header-sub">Tất cả các mặt bằng hiện có</p>
              </div>
            </div>
          </div>

          <div className="booth-cards-responsive">
            {booths.map((booth: any) => (
              <BoothCard key={booth.id} booth={booth} onClick={() => handleViewBooth(booth)} />
            ))}
          </div>
        </div>
      )}

      <Row gutter={[20, 20]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card
            title="Hoạt động gần đây"
            className="glass-panel"
            variant="borderless"
            extra={<Tag style={{ borderRadius: 8 }}>{notifications?.length || 0} thông báo</Tag>}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(notifications || []).map((item: any) => (
                <div key={item.id || item.title} style={{ borderBottom: "1px solid var(--border)", padding: "14px 0", transition: "background 0.2s", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    <Badge status={item.type === "success" ? "success" : item.type === "warning" ? "warning" : "processing"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={4}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</span>
                      <Text style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : ""}
                      </Text>
                    </Space>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{item.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Booth Detail Modal */}
      <Modal
        title={null}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={640}
        className="booth-detail-modal"
      >
        {selectedBooth && (
          <div>
            {selectedBooth.images && (
              <div className="booth-detail-gallery" style={{ marginBottom: 20 }}>
                {selectedBooth.images.split(",").filter(Boolean).map((url: string, i: number) => (
                  <BoothGalleryImage key={i} url={url} name={selectedBooth.name} index={i} />
                ))}
              </div>
            )}
            <Descriptions
              title={<span style={{ fontSize: 18, fontWeight: 800 }}>{selectedBooth.name}</span>}
              column={2}
              size="middle"
              style={{ padding: "0 4px" }}
            >
              <Descriptions.Item label="Trạng thái">
                <span className={`pulse-dot ${selectedBooth.status}`} />
                {STATUS_MAP[selectedBooth.status]?.label || selectedBooth.status}
              </Descriptions.Item>
              <Descriptions.Item label="Đơn giá">
                <strong style={{ color: "var(--primary)" }}>{selectedBooth.price.toLocaleString("vi-VN")} đ/tháng</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Vị trí">Tầng {selectedBooth.floor} - Khu {selectedBooth.zone}</Descriptions.Item>
              <Descriptions.Item label="Diện tích">{selectedBooth.area} m²</Descriptions.Item>
              <Descriptions.Item label="Mô tả" span={2}>
                {selectedBooth.description || "Chưa có mô tả chi tiết cho gian hàng này."}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
