import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme, App as AntApp } from "antd";
import { useSelector } from "react-redux";
// import type { RootState } from "./redux/store"; // removed due to Vite type import issue

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";

// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import OAuthCallback from "./pages/auth/OAuthCallback";
import VerifyContract from "./pages/contracts/VerifyContract";
import Dashboard from "./pages/dashboard/Dashboard";
import Booths from "./pages/booths/Booths";
import Customers from "./pages/customers/Customers";
import Contracts from "./pages/contracts/Contracts";
import Invoices from "./pages/invoices/Invoices";
import Payments from "./pages/payments/Payments";
import Reports from "./pages/reports/Reports";
import Accounts from "./pages/accounts/Accounts";
import Profile from "./pages/profile/Profile";

import { useSocket } from "./hooks/useSocket.tsx";

export default function App() {
  useSocket();
  const { mode } = useSelector((state: any) => state.theme);

  return (
    <AntApp>
      <ConfigProvider
        theme={{
          algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#4f46e5",
            borderRadius: 8,
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }
        }}
      >
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            <Route path="/verify-contract/:code" element={<VerifyContract />} />

            {/* Protected Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/booths" element={<Booths />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Fallback Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </AntApp>
  );
}
