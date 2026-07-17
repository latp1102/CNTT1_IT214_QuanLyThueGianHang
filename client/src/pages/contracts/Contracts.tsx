import { useState, useEffect } from "react";
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, DatePicker, InputNumber, Row, Col, Upload, Tooltip } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { SearchOutlined, PlusOutlined, DeleteOutlined, SafetyCertificateOutlined, CalendarOutlined, FilePdfOutlined, QrcodeOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import dayjs from "dayjs";
import axiosClient from "../../apis/axiosClient";

const { Option } = Select;

export default function Contracts() {
  const message = useMessage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Lists for Select boxes
  const [booths, setBooths] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);

  // Modals control
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);

  const [addForm] = Form.useForm();
  const [extendForm] = Form.useForm();
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);

  // PDF Upload state
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfName, setPdfName] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      if (status) params.status = status;

      const res: any = await axiosClient.get("/contracts", { params });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const resBooths: any = await axiosClient.get("/booths", { params: { limit: 100, status: "available" } });
      const resCustomers: any = await axiosClient.get("/customers", { params: { limit: 100 } });
      setBooths(resBooths.data.items);
      setCustomers(resCustomers.data.items);
    } catch (error: any) {
      console.error("Lỗi tải thông tin chọn lựa:", error);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [page, pageSize, status]);

  const handleSearch = () => {
    setPage(1);
    fetchContracts();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus(undefined);
    setPage(1);
  };

  const handleOpenAddModal = () => {
    fetchDropdowns();
    addForm.resetFields();
    setPdfUrl("");
    setPdfName("");
    setAddModalOpen(true);
  };

  const handleOpenExtendModal = (record: any) => {
    setSelectedContractId(record.id);
    extendForm.resetFields();
    extendForm.setFieldsValue({
      contractCode: record.contractCode,
      currentEndDate: dayjs(record.endDate)
    });
    setExtendModalOpen(true);
  };

  const customUpload = async (options: any) => {
    const { onSuccess, onError, file } = options;
    setUploading(true);
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res: any = await axiosClient.post("/contracts/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      const uploadedUrl = res.data;
      setPdfUrl(uploadedUrl);
      setPdfName(file.name);
      onSuccess(uploadedUrl);
      message.success("Tải lên tập tin PDF hợp đồng thành công!");
    } catch (err: any) {
      message.error(err.message || "Không thể tải lên tệp PDF hợp đồng.");
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateContract = async (values: any) => {
    try {
      const res: any = await axiosClient.post("/contracts", {
        boothId: values.boothId,
        customerId: values.customerId,
        deposit: values.deposit,
        startDate: values.dates[0].format("YYYY-MM-DD"),
        endDate: values.dates[1].format("YYYY-MM-DD"),
        pdfUrl: pdfUrl || undefined
      });
      message.success("Tạo hợp đồng thuê mới thành công!");
      setAddModalOpen(false);
      fetchContracts();

      if (res.data?.paymentQR) {
        setPaymentQrData(res.data.paymentQR);
        setPaymentQrModalOpen(true);
      }
    } catch (error: any) {
      message.error(error.message || "Tạo hợp đồng thất bại.");
    }
  };

  const handleExtendContract = async (values: any) => {
    if (!selectedContractId) return;
    try {
      await axiosClient.post(`/contracts/${selectedContractId}/extend`, {
        newEndDate: values.newEndDate.format("YYYY-MM-DD")
      });
      message.success("Gia hạn hợp đồng thành công!");
      setExtendModalOpen(false);
      fetchContracts();
    } catch (error: any) {
      message.error(error.message || "Gia hạn hợp đồng thất bại.");
    }
  };

  const handleTerminateContract = (id: number) => {
    Modal.confirm({
      title: "Thanh lý hợp đồng thuê",
      content: "Bạn có chắc chắn muốn thanh lý hợp đồng này không? Gian hàng sẽ tự động giải phóng sang trạng thái còn trống.",
      okText: "Thanh lý",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axiosClient.post(`/contracts/${id}/terminate`);
          message.success("Thanh lý hợp đồng thành công!");
          fetchContracts();
        } catch (error: any) {
          message.error(error.message || "Thanh lý hợp đồng thất bại.");
        }
      }
    });
  };

  const handleDeleteContract = (id: number) => {
    Modal.confirm({
      title: "Xóa hợp đồng",
      content: "Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ hợp đồng này khỏi cơ sở dữ liệu?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axiosClient.delete(`/contracts/${id}`);
          message.success("Xóa hợp đồng thành công!");
          fetchContracts();
        } catch (error: any) {
          message.error(error.message || "Xóa hợp đồng thất bại.");
        }
      }
    });
  };

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrContract, setQrContract] = useState<any>(null);

  const [paymentQrModalOpen, setPaymentQrModalOpen] = useState(false);
  const [paymentQrData, setPaymentQrData] = useState<any>(null);

  const API_BASE = "http://localhost:5000/api";

  const handleDownloadPdf = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/contracts/${id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      if (!res.ok) throw new Error("Tải PDF thất bại");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hop-dong-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      message.error(err.message || "Không thể tải PDF hợp đồng.");
    }
  };

  const columns = [
    {
      title: "Mã hợp đồng",
      key: "contractCode",
      render: (_: any, record: any) => (
        <Space>
          <strong style={{ color: "var(--primary-color)" }}>{record.contractCode}</strong>
          {record.pdfUrl && (
            <a href={record.pdfUrl} target="_blank" rel="noreferrer" title="Tải file PDF hợp đồng" style={{ fontSize: "14px", textDecoration: "none" }}>
              📄
            </a>
          )}
        </Space>
      )
    },
    {
      title: "QR",
      key: "qr",
      width: 80,
      render: (_: any, record: any) => (
        <Tooltip title="Mở mã QR xác thực">
          <Button
            type="text"
            icon={<QrcodeOutlined style={{ fontSize: 18 }} />}
            onClick={() => { setQrContract(record); setQrModalOpen(true); }}
          />
        </Tooltip>
      )
    },
    {
      title: "Tải PDF",
      key: "pdf",
      width: 80,
      render: (_: any, record: any) => (
        <Tooltip title="Tải hợp đồng PDF (có mã QR)">
          <Button
            type="text"
            icon={<FilePdfOutlined style={{ fontSize: 18, color: "#e74c3c" }} />}
            onClick={() => handleDownloadPdf(record.id)}
          />
        </Tooltip>
      )
    },
    {
      title: "Gian hàng",
      dataIndex: ["booth", "name"],
      key: "booth"
    },
    {
      title: "Khách thuê",
      dataIndex: ["customer", "name"],
      key: "customer"
    },
    {
      title: "Tiền đặt cọc",
      dataIndex: "deposit",
      key: "deposit",
      render: (val: number) => `${val.toLocaleString("vi-VN")} đ`
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "startDate",
      key: "startDate",
      render: (val: string) => dayjs(val).format("DD/MM/YYYY")
    },
    {
      title: "Ngày hết hạn",
      dataIndex: "endDate",
      key: "endDate",
      render: (val: string) => dayjs(val).format("DD/MM/YYYY")
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (val: string) => {
        let color = "green";
        let text = "Hoạt động";
        if (val === "terminated") {
          color = "gray";
          text = "Đã thanh lý";
        } else if (val === "expired") {
          color = "red";
          text = "Hết hạn";
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          {record.status === "active" && (
            <>
              <Button type="text" icon={<CalendarOutlined />} onClick={() => handleOpenExtendModal(record)} title="Gia hạn" />
              <Button type="text" danger icon={<SafetyCertificateOutlined />} onClick={() => handleTerminateContract(record.id)} title="Thanh lý" />
            </>
          )}
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteContract(record.id)} title="Xóa" />
        </Space>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <Card title="Quản lý Hợp đồng thuê gian hàng" className="glass-panel" variant="borderless" style={{ marginBottom: "24px" }}>
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: "16px" }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm kiếm mã hợp đồng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select placeholder="Lọc trạng thái" value={status} onChange={setStatus} style={{ width: "100%" }} allowClear>
              <Option value="active">Hoạt động</Option>
              <Option value="expired">Hết hạn</Option>
              <Option value="terminated">Đã thanh lý</Option>
            </Select>
          </Col>
          <Col xs={12} md={8} style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button onClick={handleClearFilters}>Đặt lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ background: "var(--primary-color)", borderColor: "var(--primary-color)" }}>
              Ký kết hợp đồng
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

      {/* Add Contract Modal */}
      <Modal
        title="Ký kết hợp đồng thuê gian hàng"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={() => addForm.submit()}
        okText="Ký hợp đồng"
        cancelText="Hủy"
        width={650}
      >
        <Form form={addForm} layout="vertical" onFinish={handleCreateContract}>
          <Form.Item name="boothId" label="Chọn gian hàng thương mại còn trống" rules={[{ required: true, message: "Hãy chọn gian hàng trống để cho thuê!" }]}>
            <Select placeholder="Chọn gian hàng trống...">
              {booths.map((b: any) => (
                <Option key={b.id} value={b.id}>
                  {b.name} - Tầng {b.floor} - Khu {b.zone} ({b.area} m² - {b.price.toLocaleString("vi-VN")} đ/Tháng)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="customerId" label="Chọn khách hàng đối tác" rules={[{ required: true, message: "Hãy chọn khách thuê đối tác!" }]}>
            <Select placeholder="Chọn khách thuê đối tác...">
              {customers.map((c: any) => (
                <Option key={c.id} value={c.id}>
                  {c.name} - CCCD: {c.idCard} {c.company ? `(${c.company})` : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dates" label="Thời hạn hợp đồng thuê (Từ - Đến)" rules={[{ required: true, message: "Chọn thời hạn thuê!" }]}>
                <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deposit" label="Tiền đặt cọc thế chân (VND)" rules={[{ required: true, message: "Nhập số tiền đặt cọc!" }]}>
                <InputNumber min={0} style={{ width: "100%" }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Bản scan Hợp đồng (Định dạng PDF)">
            <Upload
              name="pdf"
              accept=".pdf"
              showUploadList={false}
              customRequest={customUpload}
            >
              <Button icon={<PlusOutlined />} loading={uploading}>
                {pdfName ? `Thay thế: ${pdfName}` : "Tải lên bản Scan (PDF)"}
              </Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Extend Contract Modal */}
      <Modal
        title="Gia hạn thời gian thuê hợp đồng"
        open={extendModalOpen}
        onCancel={() => setExtendModalOpen(false)}
        onOk={() => extendForm.submit()}
        okText="Gia hạn"
        cancelText="Hủy"
        width={450}
      >
        <Form form={extendForm} layout="vertical" onFinish={handleExtendContract}>
          <Form.Item name="contractCode" label="Mã hợp đồng">
            <Input disabled />
          </Form.Item>
          <Form.Item name="currentEndDate" label="Ngày hết hạn hiện tại">
            <DatePicker disabled style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="newEndDate" label="Hạn gia hạn mới đến ngày" rules={[{ required: true, message: "Chọn thời hạn gia hạn mới!" }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        title="Mã QR xác thực hợp đồng"
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null}
        width={400}
        centered
      >
        {qrContract && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <QRCodeSVG
              value={`${window.location.origin}/verify-contract/${qrContract.contractCode}`}
              size={220}
              level="H"
              includeMargin
            />
            <p style={{ marginTop: 16, fontWeight: 600, fontSize: 16 }}>{qrContract.contractCode}</p>
            <p style={{ color: "#666" }}>
              Quét mã QR để xác thực hợp đồng
            </p>
          </div>
        )}
      </Modal>

      {/* Payment QR Modal */}
      <Modal
        title="Quét mã QR thanh toán tiền đặt cọc"
        open={paymentQrModalOpen}
        onCancel={() => setPaymentQrModalOpen(false)}
        footer={null}
        width={460}
        centered
      >
        {paymentQrData && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <img
              src={paymentQrData.qrDataUrl}
              alt="QR thanh toán"
              style={{ width: 240, height: 240, display: "block", margin: "0 auto 20px" }}
            />
            <div style={{
              background: "var(--bg-card)",
              borderRadius: 14,
              padding: "14px 16px",
              textAlign: "left",
              border: "1px solid var(--border)",
              marginBottom: 16
            }}>
              {[
                { label: "Ngân hàng", value: paymentQrData.bankName },
                { label: "Số tài khoản", value: paymentQrData.bankAccount },
                { label: "Chủ tài khoản", value: paymentQrData.bankHolder },
                { label: "Số tiền", value: `${paymentQrData.amount.toLocaleString("vi-VN")} đ` },
                { label: "Nội dung", value: paymentQrData.content },
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
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Quét mã QR bằng app ngân hàng để thanh toán. Số tiền đã được điền sẵn.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
