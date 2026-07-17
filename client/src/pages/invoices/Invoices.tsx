import { useState, useEffect } from "react";
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, DatePicker, InputNumber, Row, Col } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { SearchOutlined, PlusOutlined, FilePdfOutlined, FileExcelOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosClient from "../../apis/axiosClient";

const { Option } = Select;
const { TextArea } = Input;

export default function Invoices() {
  const message = useMessage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Contracts list for Dropdown
  const [contracts, setContracts] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      if (status) params.status = status;

      const res: any = await axiosClient.get("/invoices", { params });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách hóa đơn.");
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const res: any = await axiosClient.get("/contracts", { params: { limit: 100, status: "active" } });
      setContracts(res.data.items);
    } catch (error) {
      console.error("Lỗi khi tải thông tin hợp đồng:", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, pageSize, status]);

  const handleSearch = () => {
    setPage(1);
    fetchInvoices();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus(undefined);
    setPage(1);
  };

  const handleOpenAddModal = () => {
    fetchContracts();
    form.resetFields();
    setModalOpen(true);
  };

  const handleCreateInvoice = async (values: any) => {
    try {
      await axiosClient.post("/invoices", {
        contractId: values.contractId,
        title: values.title,
        description: values.description,
        amount: values.amount,
        dueDate: values.dueDate.format("YYYY-MM-DD")
      });
      message.success("Tạo hóa đơn thành công!");
      setModalOpen(false);
      fetchInvoices();
    } catch (error: any) {
      message.error(error.message || "Tạo hóa đơn thất bại.");
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa hóa đơn",
      content: "Bạn có chắc chắn muốn xóa hóa đơn chưa thanh toán này không?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axiosClient.delete(`/invoices/${id}`);
          message.success("Xóa hóa đơn thành công!");
          fetchInvoices();
        } catch (error: any) {
          message.error(error.message || "Không thể xóa hóa đơn.");
        }
      }
    });
  };

  const handleExportPdf = async (id: number) => {
    try {
      const token = localStorage.getItem("accessToken");
      const url = `http://localhost:5000/api/invoices/${id}/pdf?token=${token}`;
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.focus();
      }
    } catch (e) {
      message.error("Lỗi khi xuất hóa đơn PDF.");
    }
  };

  const handleExportExcel = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/invoices/${id}/excel`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hoa_Don_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      message.success("Tải hóa đơn Excel thành công!");
    } catch (e) {
      message.error("Lỗi khi xuất hóa đơn Excel.");
    }
  };

  const columns = [
    {
      title: "Mã hóa đơn",
      dataIndex: "invoiceCode",
      key: "invoiceCode",
      render: (text: string) => <strong style={{ color: "var(--primary-color)" }}>{text}</strong>
    },
    {
      title: "Hợp đồng",
      dataIndex: ["contract", "contractCode"],
      key: "contract"
    },
    {
      title: "Khách thuê",
      dataIndex: ["contract", "customer", "name"],
      key: "customer"
    },
    {
      title: "Gian hàng",
      dataIndex: ["contract", "booth", "name"],
      key: "booth"
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true
    },
    {
      title: "Tổng số tiền",
      dataIndex: "amount",
      key: "amount",
      render: (val: number) => `${val.toLocaleString("vi-VN")} đ`
    },
    {
      title: "Hạn thanh toán",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (val: string) => dayjs(val).format("DD/MM/YYYY")
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (val: string) => {
        let color = "gold";
        let text = "Chưa thanh toán";
        if (val === "paid") {
          color = "green";
          text = "Đã thanh toán";
        } else if (val === "overdue") {
          color = "red";
          text = "Quá hạn";
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<FilePdfOutlined style={{ color: "red" }} />} onClick={() => handleExportPdf(record.id)} title="In PDF" />
          <Button type="text" icon={<FileExcelOutlined style={{ color: "green" }} />} onClick={() => handleExportExcel(record.id)} title="Xuất Excel (CSV)" />
          {record.status !== "paid" && (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Xóa" />
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <Card title="Quản lý Hóa đơn định kỳ" className="glass-panel" variant="borderless" style={{ marginBottom: "24px" }}>
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: "16px" }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo mã hóa đơn hoặc tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select placeholder="Chọn trạng thái" value={status} onChange={setStatus} style={{ width: "100%" }} allowClear>
              <Option value="unpaid">Chưa thanh toán</Option>
              <Option value="paid">Đã thanh toán</Option>
              <Option value="overdue">Quá hạn</Option>
            </Select>
          </Col>
          <Col xs={12} md={8} style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button onClick={handleClearFilters}>Đặt lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ background: "var(--primary-color)", borderColor: "var(--primary-color)" }}>
              Tạo hóa đơn
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
        title="Phát hành hóa đơn phí dịch vụ định kỳ"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Phát hành"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateInvoice}>
          <Form.Item name="contractId" label="Chọn hợp đồng thuê liên quan" rules={[{ required: true, message: "Chọn hợp đồng cho hóa đơn!" }]}>
            <Select placeholder="Chọn hợp đồng thuê hoạt động...">
              {contracts.map((c: any) => (
                <Option key={c.id} value={c.id}>
                  {c.contractCode} - Khách thuê: {c.customer.name} ({c.booth.name})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="title" label="Tiêu đề hóa đơn" rules={[{ required: true, message: "Nhập tiêu đề hóa đơn phát hành!" }]}>
            <Input placeholder="Ví dụ: Tiền thuê gian hàng tháng 7/2026" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Số tiền cần thanh toán (VND)" rules={[{ required: true, message: "Nhập số tiền phải thanh toán!" }]}>
                <InputNumber min={0} style={{ width: "100%" }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="Hạn cuối thanh toán" rules={[{ required: true, message: "Chọn hạn thanh toán!" }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Ghi chú chi tiết chi phí">
            <TextArea rows={3} placeholder="Chi tiết tiền điện, nước phát sinh, giảm giá nếu có..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
