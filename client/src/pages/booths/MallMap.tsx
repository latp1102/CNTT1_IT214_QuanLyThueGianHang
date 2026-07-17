import { useEffect, useState, useMemo } from "react";
import { Card, Spin, Tag, Modal, Descriptions, Badge, Select, Row, Col, Space, Image, Tooltip, Segmented } from "antd";
import {
  EnvironmentOutlined, ShopOutlined, AppstoreOutlined,
  DollarOutlined, RiseOutlined, FireOutlined,
} from "@ant-design/icons";
import axiosClient from "../../apis/axiosClient";

const STATUS_COLORS: Record<string, string> = {
  available: "#22c55e",
  rented: "#3b82f6",
  maintenance: "#f59e0b"
};

const STATUS_BG: Record<string, string> = {
  available: "rgba(34,197,94,0.12)",
  rented: "rgba(59,130,246,0.12)",
  maintenance: "rgba(245,158,11,0.12)"
};

const STATUS_LABELS: Record<string, string> = {
  available: "Còn trống",
  rented: "Đã thuê",
  maintenance: "Bảo trì"
};

const ZONE_COLORS: Record<string, string> = {
  A: "#4f46e5",
  B: "#0ea5e9",
  C: "#10b981",
  D: "#f59e0b",
};

function getPriceLevel(price: number): number {
  if (price < 5000000) return 1;
  if (price < 10000000) return 2;
  if (price < 20000000) return 3;
  return 4;
}

function getPriceColor(price: number): string {
  const level = getPriceLevel(price);
  const colors = ["#22c55e", "#84cc16", "#eab308", "#ef4444"];
  return colors[level - 1];
}

function BoothRectangle({ booth, onClick, viewMode }: { booth: any; onClick: () => void; viewMode: string }) {
  const fillColor = viewMode === "heatmap" ? getPriceColor(booth.price) : STATUS_COLORS[booth.status];
  const bgColor = viewMode === "heatmap" ? getPriceColor(booth.price) + "22" : STATUS_BG[booth.status];

  return (
    <Tooltip
      title={
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{booth.name}</div>
          <div>{booth.area} m² - {booth.price.toLocaleString("vi-VN")} đ/tháng</div>
          <div>Tầng {booth.floor} - Khu {booth.zone}</div>
          <Tag color={STATUS_COLORS[booth.status]} style={{ marginTop: 4 }}>{STATUS_LABELS[booth.status]}</Tag>
          {viewMode === "heatmap" && (
            <div style={{ marginTop: 2, fontSize: 11, opacity: 0.8 }}>
              Giá: {getPriceLevel(booth.price)}/4
            </div>
          )}
        </div>
      }
    >
      <div
        className="booth-grid-cell"
        onClick={onClick}
        style={{
          width: "100%", height: "100%",
          background: bgColor,
          border: `2px solid ${fillColor}`,
          borderRadius: 8,
          cursor: "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = `0 8px 24px ${fillColor}44`;
          e.currentTarget.style.zIndex = "10";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.zIndex = "1";
        }}
      >
        <div style={{
          position: "absolute", top: 4, left: 6, right: 6,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#fff",
            textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
            maxWidth: "70%", textShadow: "0 1px 3px rgba(0,0,0,0.3)"
          }}>
            {booth.name}
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: fillColor, flexShrink: 0,
            boxShadow: `0 0 6px ${fillColor}`,
          }} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginTop: 16, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
          {booth.area} m²
        </div>
        <div style={{ fontSize: 9, color: "#fff", fontWeight: 700, marginTop: 2, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
          {booth.price.toLocaleString("vi-VN")} đ
        </div>
        {viewMode === "heatmap" && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: 4, background: fillColor,
            borderRadius: "0 0 6px 6px",
          }} />
        )}
      </div>
    </Tooltip>
  );
}

export default function MallMap() {
  const [booths, setBooths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooth, setSelectedBooth] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>("status");

  useEffect(() => {
    fetchBooths();
  }, []);

  const fetchBooths = async () => {
    setLoading(true);
    try {
      const res: any = await axiosClient.get("/booths", { params: { limit: 200 } });
      setBooths(res.data.items);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const floors = useMemo(() => [...new Set(booths.map((b) => b.floor))].sort(), [booths]);
  const zones = useMemo(() => [...new Set(booths.map((b) => b.zone))].sort(), [booths]);

  const filtered = useMemo(() => {
    let result = booths;
    if (floorFilter) result = result.filter((b) => b.floor === floorFilter);
    if (zoneFilter) result = result.filter((b) => b.zone === zoneFilter);
    return result;
  }, [booths, floorFilter, zoneFilter]);

  const groupedByZone = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filtered.forEach((b) => {
      if (!groups[b.zone]) groups[b.zone] = [];
      groups[b.zone].push(b);
    });
    return groups;
  }, [filtered]);

  const statSummary = useMemo(() => {
    const total = filtered.length;
    const available = filtered.filter((b) => b.status === "available").length;
    const rented = filtered.filter((b) => b.status === "rented").length;
    const maintenance = filtered.filter((b) => b.status === "maintenance").length;
    const avgPrice = total > 0 ? filtered.reduce((s, b) => s + b.price, 0) / total : 0;
    return { total, available, rented, maintenance, avgPrice };
  }, [filtered]);

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in">
      <Card className="glass-panel" variant="borderless">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EnvironmentOutlined style={{ fontSize: 20, color: "var(--primary)" }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>Sơ đồ mặt bằng trung tâm thương mại</span>
          </div>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as string)}
            options={[
              { label: <span><ShopOutlined /> Trạng thái</span>, value: "status" },
              { label: <span><FireOutlined /> Giá thuê</span>, value: "heatmap" },
            ]}
          />
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col>
            <Select
              placeholder="Tất cả tầng"
              value={floorFilter}
              onChange={setFloorFilter}
              allowClear
              style={{ width: 150 }}
            >
              {floors.map((f) => (
                <Select.Option key={f} value={f}>Tầng {f}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Tất cả khu"
              value={zoneFilter}
              onChange={setZoneFilter}
              allowClear
              style={{ width: 150 }}
            >
              {zones.map((z) => (
                <Select.Option key={z} value={z}>Khu {z}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space size="middle" style={{ fontSize: 13 }}>
              <span>
                <Badge color="#22c55e" /> {statSummary.available} trống
              </span>
              <span>
                <Badge color="#3b82f6" /> {statSummary.rented} đã thuê
              </span>
              <span>
                <Badge color="#f59e0b" /> {statSummary.maintenance} bảo trì
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                | TB: {statSummary.avgPrice.toLocaleString("vi-VN")} đ
              </span>
            </Space>
          </Col>
        </Row>

        <div style={{
          position: "relative",
          minHeight: 500,
          background: "var(--bg-card-glass)",
          borderRadius: 16,
          padding: 28,
          border: "1px solid var(--border)",
        }}>
          {viewMode === "heatmap" && (
            <div style={{
              display: "flex", justifyContent: "flex-end", gap: 8,
              marginBottom: 16, fontSize: 11,
            }}>
              <span style={{ color: "#22c55e" }}>● Thấp</span>
              <span style={{ color: "#84cc16" }}>●</span>
              <span style={{ color: "#eab308" }}>●</span>
              <span style={{ color: "#ef4444" }}>● Cao</span>
            </div>
          )}

          {Object.keys(groupedByZone).length === 0 ? (
            <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>
              <ShopOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
              <div>Chưa có dữ liệu gian hàng</div>
            </div>
          ) : (
            Object.entries(groupedByZone).map(([zone, zoneBooths]) => (
              <div key={zone} style={{ marginBottom: 28 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  marginBottom: 12,
                }}>
                  <div style={{
                    width: 4, height: 20, borderRadius: 2,
                    background: ZONE_COLORS[zone] || "#4f46e5",
                  }} />
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: "var(--text-secondary)",
                    textTransform: "uppercase", letterSpacing: 1.5,
                  }}>
                    Khu {zone}
                  </div>
                  <Tag style={{ fontSize: 10, borderRadius: 6, marginLeft: 4 }}>
                    {zoneBooths.length} gian
                  </Tag>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fill, minmax(130px, 1fr))`,
                  gap: 10,
                }}>
                  {zoneBooths.map((booth) => (
                    <BoothRectangle
                      key={booth.id}
                      booth={booth}
                      viewMode={viewMode}
                      onClick={() => { setSelectedBooth(booth); setModalOpen(true); }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          <div style={{
            marginTop: 20, padding: "12px 16px",
            background: "var(--bg-card)", borderRadius: 10,
            border: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between",
            alignItems: "center", fontSize: 12, color: "var(--text-muted)",
          }}>
            <span>
              <AppstoreOutlined style={{ marginRight: 4 }} />
              Tổng: <strong>{filtered.length}</strong> gian hàng
            </span>
            <span>
              <RiseOutlined style={{ marginRight: 4 }} />
              Tỉ lệ lấp đầy: <strong>
                {filtered.length > 0
                  ? ((statSummary.rented / filtered.length) * 100).toFixed(0)
                  : 0}%
              </strong>
            </span>
            <span>
              <DollarOutlined style={{ marginRight: 4 }} />
              Doanh thu tiềm năng: <strong>
                {filtered.filter(b => b.status === "rented")
                  .reduce((s, b) => s + b.price, 0)
                  .toLocaleString("vi-VN")} đ/tháng
              </strong>
            </span>
          </div>
        </div>
      </Card>

      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        {selectedBooth && (
          <div>
            {selectedBooth.images && (
              <div style={{
                display: "flex", gap: 8, overflow: "auto",
                marginBottom: 20, paddingBottom: 4,
              }}>
                {selectedBooth.images.split(",").filter(Boolean).map((url: string, idx: number) => (
                  <Image key={idx} src={url} alt={`${selectedBooth.name}`}
                    width={160} height={110}
                    style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                  />
                ))}
              </div>
            )}
            <Descriptions
              title={<span style={{ fontSize: 18, fontWeight: 800 }}>{selectedBooth.name}</span>}
              column={2} size="small" bordered
            >
              <Descriptions.Item label="Trạng thái">
                <Tag color={STATUS_COLORS[selectedBooth.status]}>{STATUS_LABELS[selectedBooth.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Đơn giá">
                <strong style={{ color: "var(--primary)" }}>
                  {selectedBooth.price.toLocaleString("vi-VN")} đ/tháng
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Vị trí">Tầng {selectedBooth.floor}</Descriptions.Item>
              <Descriptions.Item label="Khu vực">Khu {selectedBooth.zone}</Descriptions.Item>
              <Descriptions.Item label="Diện tích">{selectedBooth.area} m²</Descriptions.Item>
              <Descriptions.Item label="Mức giá">
                <span style={{ color: getPriceColor(selectedBooth.price) }}>
                  {"●".repeat(getPriceLevel(selectedBooth.price))}
                  {"○".repeat(4 - getPriceLevel(selectedBooth.price))}
                  <span style={{ marginLeft: 4, color: "#64748b", fontSize: 11 }}>
                    (Bậc {getPriceLevel(selectedBooth.price)}/4)
                  </span>
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả" span={2}>
                {selectedBooth.description || "Không có mô tả"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
