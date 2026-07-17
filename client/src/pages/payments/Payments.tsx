import { useState, useEffect } from "react";
import { Table, Card, Button, Input, Select, Tag, Modal, Form, DatePicker, InputNumber, Row, Col } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { SearchOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosClient from "../../apis/axiosClient";

const { Option } = Select;

export default function Payments() {
  const message = useMessage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Lists for dropdowns
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [method, setMethod] = useState<string | undefined>(undefined);

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);

  // QR Code state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      if (status) params.status = status;
      if (method) params.paymentMethod = method;

      const res: any = await axiosClient.get("/payments", { params });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách giao dịch.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const resContracts: any = await axiosClient.get("/contracts", { params: { limit: 100 } });
      setContracts(resContracts.data.items);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchInvoicesForContract = async (contractId: number) => {
    try {
      const resInvoices: any = await axiosClient.get("/invoices", { params: { contractId, status: "unpaid", limit: 50 } });
      setInvoices(resInvoices.data.items);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, pageSize, status, method]);

  const handleSearch = () => {
    setPage(1);
    fetchPayments();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus(undefined);
    setMethod(undefined);
    setPage(1);
  };

  const handleOpenAddModal = () => {
    fetchDropdowns();
    form.resetFields();
    setInvoices([]);
    setSelectedContractId(null);
    setModalOpen(true);
  };

  const handleContractChange = (val: number) => {
    setSelectedContractId(val);
    fetchInvoicesForContract(val);
    form.setFieldsValue({ invoiceId: undefined, amount: undefined });
  };

  const handleInvoiceChange = (val: number) => {
    const invoice: any = invoices.find((i: any) => i.id === val);
    if (invoice) {
      form.setFieldsValue({ amount: invoice.amount });
    }
  };

  const handleCreatePayment = async (values: any) => {
    try {
      const selectedMethod = values.paymentMethod;
      if (selectedMethod === "qr_code") {
        await handleGenerateQR(values.contractId, values.invoiceId || null, values.amount);
        return;
      }
      if (selectedMethod === "vnpay" || selectedMethod === "momo") {
        const endpoint = selectedMethod === "vnpay" ? "/payments/vnpay-url" : "/payments/momo-url";
        const res: any = await axiosClient.post(endpoint, {
          amount: values.amount,
          orderInfo: `Thanh toan phi dich vu hop dong ${values.contractId}`
        });

        // Open mock portal link in a new browser tab
        window.open(res.data, "_blank");

        Modal.confirm({
          title: "Đang chuyển tiếp cổng thanh toán trực tuyến",
          content: "Tab mới cổng thanh toán đã được mở. Vui lòng xác nhận kết quả sau khi thực hiện giao dịch giả lập.",
          okText: "Giao dịch thành công",
          cancelText: "Hủy bỏ giao dịch",
          onOk: async () => {
            await axiosClient.post("/payments", {
              ...values,
              status: "completed",
              paymentDate: values.paymentDate ? values.paymentDate.format("YYYY-MM-DD") : undefined
            });
            message.success("Giao dịch thanh toán được ghi nhận thành công!");
            setModalOpen(false);
            fetchPayments();
          }
        });
      } else {
        await axiosClient.post("/payments", {
          ...values,
          status: "completed",
          paymentDate: values.paymentDate ? values.paymentDate.format("YYYY-MM-DD") : undefined
        });
        message.success("Ghi nhận giao dịch đóng tiền mặt/chuyển khoản thành công!");
        setModalOpen(false);
        fetchPayments();
      }
    } catch (error: any) {
      message.error(error.message || "Lưu thông tin giao dịch thanh toán thất bại.");
    }
  };

  const handleConfirmQRPayment = async () => {
    if (!qrData) return;
    try {
      const values = form.getFieldsValue();
      await axiosClient.post("/payments", {
        ...values,
        status: "completed",
        paymentDate: values.paymentDate ? values.paymentDate.format("YYYY-MM-DD") : undefined
      });
      message.success("Thanh toán qua mã QR thành công!");
      setQrModalOpen(false);
      setModalOpen(false);
      fetchPayments();
    } catch (error: any) {
      message.error(error.message || "Ghi nhận thanh toán thất bại.");
    }
  };

  const handleGenerateQR = async (contractId: number, invoiceId: number | null, amount: number) => {
    setQrLoading(true);
    try {
      const res: any = await axiosClient.post("/payments/qr-code", { contractId, invoiceId, amount });
      setQrData(res.data);
      setQrModalOpen(true);
    } catch (error: any) {
      message.error(error.message || "Không thể tạo mã QR thanh toán.");
    } finally {
      setQrLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa giao dịch",
      content: "Bạn có chắc chắn muốn xóa lịch sử giao dịch này khỏi hệ thống?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axiosClient.delete(`/payments/${id}`);
          message.success("Xóa giao dịch thành công!");
          fetchPayments();
        } catch (error: any) {
          message.error(error.message || "Xóa giao dịch thất bại.");
        }
      }
    });
  };

  const columns = [
    {
      title: "Mã giao dịch",
      dataIndex: "paymentCode",
      key: "paymentCode",
      render: (text: string) => <strong style={{ color: "var(--primary-color)" }}>{text}</strong>
    },
    {
      title: "Mã hợp đồng",
      dataIndex: ["contract", "contractCode"],
      key: "contract"
    },
    {
      title: "Khách thuê",
      dataIndex: ["contract", "customer", "name"],
      key: "customer"
    },
    {
      title: "Mã hóa đơn",
      dataIndex: ["invoice", "invoiceCode"],
      key: "invoice",
      render: (val: string) => val || <span style={{ color: "var(--text-muted)" }}>Tiền đặt cọc</span>
    },
    {
      title: "Số tiền nộp",
      dataIndex: "amount",
      key: "amount",
      render: (val: number) => `${val.toLocaleString("vi-VN")} đ`
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (val: string) => {
        let text = "Tiền mặt";
        if (val === "bank_transfer") text = "Chuyển khoản";
        else if (val === "qr_code") text = "Mã QR";
        else if (val === "vnpay") text = "VNPay";
        else if (val === "momo") text = "Ví MoMo";
        return <Tag color="blue">{text}</Tag>;
      }
    },
    {
      title: "Ngày nộp tiền",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (val: string) => dayjs(val).format("DD/MM/YYYY HH:mm")
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (val: string) => (
        <Tag color={val === "completed" ? "green" : val === "pending" ? "gold" : "red"}>
          {val === "completed" ? "Thành công" : val === "pending" ? "Đang xử lý" : "Thất bại"}
        </Tag>
      )
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: any) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Xóa lịch sử" />
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <Card title="Quản lý Giao dịch & Thanh toán" className="glass-panel" variant="borderless" style={{ marginBottom: "24px" }}>
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: "16px" }}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Tìm kiếm mã giao dịch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select placeholder="Phương thức" value={method} onChange={setMethod} style={{ width: "100%" }} allowClear>
              <Option value="cash">Tiền mặt</Option>
              <Option value="bank_transfer">Chuyển khoản</Option>
              <Option value="qr_code">Mã QR</Option>
              <Option value="vnpay">VNPay</Option>
              <Option value="momo">Ví MoMo</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select placeholder="Trạng thái" value={status} onChange={setStatus} style={{ width: "100%" }} allowClear>
              <Option value="completed">Thành công</Option>
              <Option value="pending">Đang xử lý</Option>
              <Option value="failed">Thất bại</Option>
            </Select>
          </Col>
          <Col xs={12} md={8} style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button onClick={handleClearFilters}>Đặt lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ background: "var(--primary-color)", borderColor: "var(--primary-color)" }}>
              Ghi nhận đóng tiền
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            }
          }}
        />
      </Card>

      <Modal
        title="Nộp tiền phí thuê mặt bằng mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Ghi nhận giao dịch"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePayment} initialValues={{ paymentMethod: "cash", paymentDate: dayjs() }}>
          <Form.Item name="contractId" label="Chọn hợp đồng thuê liên quan" rules={[{ required: true, message: "Chọn hợp đồng cho giao dịch đóng tiền!" }]}>
            <Select placeholder="Chọn hợp đồng thuê..." onChange={handleContractChange}>
              {contracts.map((c: any) => (
                <Option key={c.id} value={c.id}>
                  {c.contractCode} - Khách thuê: {c.customer.name} ({c.booth.name})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="invoiceId" label="Chọn hóa đơn cần thanh toán đóng tiền (Tùy chọn)">
            <Select placeholder="Chọn hóa đơn chưa thanh toán của hợp đồng..." onChange={handleInvoiceChange} disabled={!selectedContractId}>
              {invoices.map((i: any) => (
                <Option key={i.id} value={i.id}>
                  {i.invoiceCode} - {i.title} ({i.amount.toLocaleString("vi-VN")} đ)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Số tiền đóng thực tế (VND)" rules={[{ required: true, message: "Nhập số tiền giao dịch thực tế!" }]}>
                <InputNumber min={100} style={{ width: "100%" }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="Ngày giao dịch thanh toán" rules={[{ required: true }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="paymentMethod" label="Phương thức thanh toán" rules={[{ required: true }]}>
            <Select>
              <Option value="cash">Nộp tiền mặt tại quầy lễ tân</Option>
              <Option value="bank_transfer">Chuyển khoản Ngân hàng (Internet Banking)</Option>
              <Option value="qr_code">Quét mã QR (Chuyển khoản Ngân hàng)</Option>
              <Option value="vnpay">Thanh toán qua Cổng VNPay (Giả lập trực tuyến)</Option>
              <Option value="momo">Thanh toán qua Ví MoMo (Giả lập trực tuyến)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span style={{ fontWeight: 700 }}>Quét mã QR - Thanh toán chuyển khoản</span>}
        open={qrModalOpen}
        onCancel={() => { if (!qrLoading) { setQrModalOpen(false); setQrData(null); } }}
        onOk={handleConfirmQRPayment}
        okText="✓ Đã thanh toán"
        cancelText="Hủy"
        width={460}
        confirmLoading={qrLoading}
        footer={(_, { OkBtn, CancelBtn }) => (
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <CancelBtn />
            <OkBtn />
          </div>
        )}
      >
        {qrData && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{
              background: "#fff",
              borderRadius: 20,
              padding: 16,
              display: "inline-block",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              marginBottom: 20,
              position: "relative",
            }}>
              <div className="animate-pulse-glow" style={{
                position: "absolute",
                inset: -2,
                borderRadius: 22,
                background: "linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)",
                opacity: 0.2,
                zIndex: 0,
              }} />
              <img src={qrData.qrDataUrl} alt="QR" style={{ width: 240, height: 240, display: "block", position: "relative", zIndex: 1 }} />
            </div>

            <div style={{
              background: "var(--bg-card)",
              borderRadius: 14,
              padding: "14px 16px",
              textAlign: "left",
              border: "1px solid var(--border)",
            }}>
              {[
                { label: "Ngân hàng", value: qrData.bankName },
                { label: "Số tài khoản", value: qrData.bankAccount },
                { label: "Chủ tài khoản", value: qrData.bankHolder },
                { label: "Số tiền", value: `${qrData.amount.toLocaleString("vi-VN")} đ` },
                { label: "Nội dung", value: qrData.content },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: i < 4 ? "1px solid var(--border)" : "none",
                  fontSize: 13,
                }}>
                  <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <strong style={{ color: "var(--text)" }}>{row.value}</strong>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "rgba(79,70,229,0.08)",
              borderRadius: 10,
              border: "1px solid rgba(79,70,229,0.15)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}>
              Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản. Nhấn <strong style={{ color: "var(--primary)" }}>"Đã thanh toán"</strong> sau khi thực hiện.
            </div>
          </div>
        )}
        {qrLoading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="skeleton" style={{ width: 240, height: 240, margin: "0 auto 16px", borderRadius: 20 }} />
            <div className="skeleton" style={{ width: "80%", height: 14, margin: "0 auto" }} />
          </div>
        )}
      </Modal>
    </div>
  );
}
