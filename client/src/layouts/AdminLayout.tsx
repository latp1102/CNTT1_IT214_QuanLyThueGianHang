import { useState, useEffect, useRef } from "react";
import { Layout, Menu, Button, Avatar, Space, Badge, Popover, Typography, Divider } from "antd";
import { Link, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../redux/store";
import { logout } from "../redux/slices/authSlice";
import { toggleTheme } from "../redux/slices/themeSlice";
import { io, type Socket } from "socket.io-client";
import ChatBot from "../components/ChatBot";
import { VideoCallProvider } from "../components/VideoCallContext";
import { OnlineUsersSelect } from "../components/OnlineUsersSelect";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ShopOutlined,
  TeamOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  DollarOutlined,
  PieChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  RightCircleOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);

  const { user, isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      auth: { token: accessToken }
    });
    socketRef.current = socket;

    socket.on("notification", (data: { title: string; content: string; type?: string }) => {
      setNotifications((prev) => {
        const updated = [{ id: Date.now(), title: data.title, desc: data.content, type: data.type || "info" }, ...prev];
        return updated.slice(0, 20);
      });
    });

    return () => { socket.disconnect(); };
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (mode === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [mode]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const hasPermission = () => true;

  const menuItems = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: <Link to="/dashboard">Tổng quan</Link>, visible: true },
    { key: "/booths", icon: <ShopOutlined />, label: <Link to="/booths">Gian hàng</Link>, visible: hasPermission("booth:read") },
    { key: "/customers", icon: <TeamOutlined />, label: <Link to="/customers">Khách thuê</Link>, visible: hasPermission("customer:read") },
    { key: "/contracts", icon: <FileTextOutlined />, label: <Link to="/contracts">Hợp đồng</Link>, visible: hasPermission("contract:read") },
    { key: "/invoices", icon: <DollarOutlined />, label: <Link to="/invoices">Hóa đơn</Link>, visible: hasPermission("invoice:read") },
    { key: "/payments", icon: <CreditCardOutlined />, label: <Link to="/payments">Thanh toán</Link>, visible: hasPermission("payment:read") },
    { key: "/reports", icon: <PieChartOutlined />, label: <Link to="/reports">Báo cáo</Link>, visible: hasPermission("report:read") },
    { key: "/accounts", icon: <SettingOutlined />, label: <Link to="/accounts">Tài khoản</Link>, visible: hasPermission("account:read") },
  ].filter(item => item.visible).map(({ visible, ...rest }) => rest);

  const notificationsPopover = (
    <div style={{ width: 320 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 14 }}>Thông báo</strong>
        <Link to="/dashboard" style={{ fontSize: 12, color: "var(--primary)" }}>Xem tất cả</Link>
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          Không có thông báo mới
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {notifications.map((item: any) => (
            <div key={item.id} style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.2s", display: "flex", alignItems: "flex-start", gap: 12 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Badge status={item.type === "success" ? "success" : item.type === "warning" ? "warning" : "processing"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <VideoCallProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <ChatBot />
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={72}
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            zIndex: 100,
            background: "var(--bg-sidebar)",
            borderRight: "1px solid var(--border)",
            overflow: "auto",
          }}
        >
          <div style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 0 : "0 20px",
            borderBottom: "1px solid var(--border)",
            transition: "all 0.2s",
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--primary-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            {!collapsed && (
              <h2 style={{ margin: "0 0 0 10px", fontSize: 17, fontWeight: 800, whiteSpace: "nowrap" }}>
                GIAN HÀNG<span style={{ color: "var(--primary)" }}>.</span>
              </h2>
            )}
          </div>

          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ paddingTop: 4, border: "none" }}
          />

          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: "1px solid var(--border)",
            background: "var(--bg-sidebar)",
          }}>
            {collapsed ? (
              <>
                <Popover
                  placement="rightBottom"
                  trigger="click"
                  content={
                    <div style={{ width: 220 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                        <Avatar size={44} src={user.avatar || undefined} icon={!user.avatar && <UserOutlined />} style={{ border: "2px solid var(--primary)", flexShrink: 0 }} />
                        <div style={{ overflow: "hidden" }}>
                          <Text strong style={{ fontSize: 14, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.username}</Text>
                          <Text style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{user.roles.join(", ")}</Text>
                          {user.email && <Text style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>{user.email}</Text>}
                        </div>
                      </div>
                      <div style={{ padding: "4px 8px" }}>
                        <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "var(--text)", transition: "background 0.2s", textDecoration: "none" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <UserOutlined style={{ fontSize: 15, color: "var(--primary)" }} /><span style={{ fontSize: 13 }}>Thông tin cá nhân</span>
                        </Link>
                        <Link to="/accounts" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "var(--text)", transition: "background 0.2s", textDecoration: "none" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <SettingOutlined style={{ fontSize: 15, color: "var(--primary)" }} /><span style={{ fontSize: 13 }}>Cài đặt tài khoản</span>
                        </Link>
                        <Divider style={{ margin: "6px 0", borderColor: "var(--border)" }} />
                        <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "#ef4444", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <LogoutOutlined style={{ fontSize: 15 }} /><span style={{ fontSize: 13, fontWeight: 500 }}>Đăng xuất</span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", cursor: "pointer", transition: "background 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar size={34} src={user.avatar || undefined} icon={!user.avatar && <UserOutlined />} style={{ border: "2px solid var(--primary)", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }} />
                  </div>
                </Popover>
                <div style={{ display: "flex", justifyContent: "center", padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                  <Button type="text" icon={<RightCircleOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 16, opacity: 0.5, transition: "opacity 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")} />
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", padding: "0 8px 0 0" }}>
                <Popover
                  placement="topLeft"
                  trigger="click"
                  content={
                    <div style={{ width: 220 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                        <Avatar size={44} src={user.avatar || undefined} icon={!user.avatar && <UserOutlined />} style={{ border: "2px solid var(--primary)", flexShrink: 0 }} />
                        <div style={{ overflow: "hidden" }}>
                          <Text strong style={{ fontSize: 14, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.username}</Text>
                          <Text style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{user.roles.join(", ")}</Text>
                          {user.email && <Text style={{ fontSize: 11, color: "var(--text-muted)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</Text>}
                        </div>
                      </div>
                      <div style={{ padding: "4px 8px" }}>
                        <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "var(--text)", transition: "background 0.2s", textDecoration: "none" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <UserOutlined style={{ fontSize: 15, color: "var(--primary)" }} /><span style={{ fontSize: 13 }}>Thông tin cá nhân</span>
                        </Link>
                        <Link to="/accounts" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "var(--text)", transition: "background 0.2s", textDecoration: "none" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <SettingOutlined style={{ fontSize: 15, color: "var(--primary)" }} /><span style={{ fontSize: 13 }}>Cài đặt tài khoản</span>
                        </Link>
                        <Divider style={{ margin: "6px 0", borderColor: "var(--border)" }} />
                        <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "#ef4444", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <LogoutOutlined style={{ fontSize: 15 }} /><span style={{ fontSize: 13, fontWeight: 500 }}>Đăng xuất</span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 8px 11px 14px", cursor: "pointer", flex: 1, transition: "background 0.2s", borderRadius: 8, margin: "4px 0 4px 4px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar size={34} src={user.avatar || undefined} icon={!user.avatar && <UserOutlined />} style={{ border: "2px solid var(--primary)", boxShadow: "0 2px 8px rgba(79,70,229,0.25)", flexShrink: 0 }} />
                    <div style={{ overflow: "hidden", flex: 1 }}>
                      <Text strong style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "1.3" }}>{user.username}</Text>
                      <Text style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize", lineHeight: "1.3" }}>{user.roles.join(", ")}</Text>
                    </div>
                  </div>
                </Popover>

                <Button
                  type="text"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  style={{ fontSize: 16, opacity: 0.5, transition: "opacity 0.2s", flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                />
              </div>
            )}
          </div>
        </Sider>
        
        <Layout>
          <Header style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 99,
          }}>
            <Space>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: 16, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
              />
            </Space>

            <Space size="middle" align="center">
              <OnlineUsersSelect />

              <Button
                type="text"
                icon={mode === "dark" ? <SunOutlined style={{ color: "#fbbf24" }} /> : <MoonOutlined />}
                onClick={() => dispatch(toggleTheme())}
                style={{ fontSize: 16, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
              />

              <Popover content={notificationsPopover} trigger="click" placement="bottomRight">
                <Badge count={notifications.length} size="small" offset={[-2, 4]}>
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    style={{ fontSize: 18, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                  />
                </Badge>
              </Popover>
            </Space>
          </Header>
          
          <Content style={{ padding: "24px 28px", minHeight: 280 }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </VideoCallProvider>
  );
}
