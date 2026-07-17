import { Outlet, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";

const features = [
  { icon: "🏪", bg: "rgba(99,102,241,0.15)", title: "Quản lý mặt bằng", desc: "Theo dõi toàn bộ gian hàng, tình trạng cho thuê và bảo trì trực quan trên bản đồ." },
  { icon: "📄", bg: "rgba(16,185,129,0.15)", title: "Hợp đồng thông minh", desc: "Tạo hợp đồng, gia hạn, thanh lý và tự động phát hành hóa đơn định kỳ." },
  { icon: "💳", bg: "rgba(245,158,11,0.15)", title: "Thanh toán đa kênh", desc: "Hỗ trợ tiền mặt, chuyển khoản và cổng thanh toán trực tuyến VNPay/MoMo." },
  { icon: "📊", bg: "rgba(236,72,153,0.15)", title: "Báo cáo doanh thu", desc: "Phân tích doanh thu đa chiều, dự đoán xu hướng và theo dõi công nợ." },
];

function AuthLayout() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-split">
      {/* Left: Hero / Feature Showcase */}
      <div className="auth-hero">
        <div className="auth-hero-bg">
          {[
            { size: 400, top: -100, left: -100, delay: 0, color: "rgba(99,102,241,0.12)" },
            { size: 300, top: "50%", right: -80, delay: 1.5, color: "rgba(14,165,233,0.1)" },
            { size: 200, bottom: 60, left: "30%", delay: 3, color: "rgba(16,185,129,0.08)" },
            { size: 350, top: "10%", right: "20%", delay: 0.8, color: "rgba(245,158,11,0.06)" },
          ].map((orb, i) => (
            <div key={i} className="animate-float" style={{
              position: "absolute",
              width: orb.size, height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
              top: orb.top, left: orb.left, right: orb.right, bottom: orb.bottom,
              animationDelay: `${orb.delay}s`,
              filter: "blur(30px)",
            }} />
          ))}
        </div>

        <div className="auth-hero-content animate-fade-in-up">
          <div className="auth-hero-title">
            Hệ thống Quản lý<br />
            <span style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Thuê Gian hàng
            </span>
          </div>
          <p className="auth-hero-subtitle">
            Nền tảng quản lý vận hành cho thuê mặt bằng bán lẻ tại các trung tâm thương mại.
            Tự động hóa chu trình cho thuê, theo dõi công nợ và phân tích doanh thu.
          </p>

          <div className="auth-features">
            {features.map((f, i) => (
              <div key={i} className="auth-feature-item animate-fade-in" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className="auth-feature-icon" style={{ background: f.bg }}>{f.icon}</div>
                <div className="auth-feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-hero-stats">
            <div className="auth-hero-stat">
              <h3>150+</h3>
              <p>Gian hàng</p>
            </div>
            <div className="auth-hero-stat">
              <h3>500+</h3>
              <p>Khách thuê</p>
            </div>
            <div className="auth-hero-stat">
              <h3>98%</h3>
              <p>Hài lòng</p>
            </div>
          </div>

          <div className="auth-testimonial">
            <p className="auth-testimonial-text">
              "Hệ thống giúp chúng tôi tiết kiệm 70% thời gian quản lý hợp đồng và theo dõi công nợ.
              Giao diện trực quan, dễ sử dụng."
            </p>
            <div className="auth-testimonial-author">
              <div>TP</div>
              <div>
                <strong>Thế Phong</strong>
                <span> — Giám đốc vận hành</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="auth-form-wrapper">
        <div className="auth-form-card glass-panel animate-fade-in-up" style={{
          borderRadius: 20,
          padding: "36px 28px 32px",
          backdropFilter: "blur(24px)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px", color: "var(--text)" }}>
              GIAN HÀNG <span style={{ color: "var(--primary)" }}>PORTAL</span>
            </h2>
            <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
              Hệ thống quản lý thuê gian hàng thương mại
            </p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
