import { useState, useEffect } from "react";
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, InputNumber, Row, Col, Upload, Tabs } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, EnvironmentOutlined } from "@ant-design/icons";
import axiosClient from "../../apis/axiosClient";
import MallMap from "./MallMap";

const { Option } = Select;
const { TextArea } = Input;

export default function Booths() {
  const message = useMessage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState<number | undefined>(undefined);
  const [zone, setZone] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);

  const fetchBooths = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      if (floor !== undefined) params.floor = floor;
      if (zone) params.zone = zone;
      if (status) params.status = status;

      const res: any = await axiosClient.get("/booths", { params });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách gian hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooths();
  }, [page, pageSize, floor, zone, status]);

  const handleSearch = () => {
    setPage(1);
    fetchBooths();
  };

  const handleClearFilters = () => {
    setSearch("");
    setFloor(undefined);
    setZone(undefined);
    setStatus(undefined);
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa gian hàng",
      content: "Bạn có chắc chắn muốn xóa gian hàng này không? Hành động này sẽ không thể khôi phục.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axiosClient.delete(`/booths/${id}`);
          message.success("Xóa gian hàng thành công!");
          fetchBooths();
        } catch (error: any) {
          message.error(error.message || "Xóa gian hàng thất bại.");
        }
      }
    });
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setFileList([]);
    setModalOpen(true);
  };

  const handleOpenEditModal = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    if (record.images) {
      const urls = record.images.split(",").filter(Boolean);
      setFileList(urls.map((url: string, idx: number) => ({
        uid: `-${idx}`,
        name: `image-${idx}.png`,
        status: "done",
        url: url
      })));
    } else {
      setFileList([]);
    }
    setModalOpen(true);
  };

  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const customUpload = async (options: any) => {
    const { onSuccess, onError, file } = options;
    const formData = new FormData();
    formData.append("images", file);

    try {
      const res: any = await axiosClient.post("/booths/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      const uploadedUrl = res.data[0];
      onSuccess(uploadedUrl);
    } catch (err: any) {
      message.error(err.message || "Không thể tải lên hình ảnh.");
      onError(err);
    }
  };

  const handleSave = async (values: any) => {
    try {
      const imageUrls = fileList
        .map((f: any) => f.url || f.response)
        .filter(Boolean)
        .join(",");

      const payload = {
        ...values,
        images: imageUrls
      };

      if (editingId) {
        await axiosClient.put(`/booths/${editingId}`, payload);
        message.success("Cập nhật thông tin gian hàng thành công!");
      } else {
        await axiosClient.post("/booths", payload);
        message.success("Thêm gian hàng mới thành công!");
      }
      setModalOpen(false);
      fetchBooths();
    } catch (error: any) {
      message.error(error.message || "Lưu thông tin gian hàng thất bại.");
    }
  };

  const columns = [
    {
      title: "Gian hàng",
      key: "name",
      render: (_: any, record: any) => {
        const firstImg = record.images ? record.images.split(",")[0] : null;
        return (
          <Space>
            {firstImg ? (
              <img src={firstImg} alt={record.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border-color)" }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-color)", fontWeight: "bold" }}>
                GH
              </div>
            )}
            <strong style={{ color: "var(--primary-color)" }}>{record.name}</strong>
          </Space>
        );
      }
    },
    {
      title: "Vị trí Tầng",
      dataIndex: "floor",
      key: "floor",
      render: (val: number) => `Tầng ${val}`
    },
    {
      title: "Khu vực",
      dataIndex: "zone",
      key: "zone",
      render: (val: string) => `Khu ${val}`
    },
    {
      title: "Diện tích",
      dataIndex: "area",
      key: "area",
      render: (val: number) => `${val} m²`
    },
    {
      title: "Đơn giá thuê / Tháng",
      dataIndex: "price",
      key: "price",
      render: (val: number) => `${val.toLocaleString("vi-VN")} đ`
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (val: string) => {
        let color = "green";
        let text = "Còn trống";
        if (val === "rented") {
          color = "blue";
          text = "Đang thuê";
        } else if (val === "maintenance") {
          color = "volcano";
          text = "Bảo trì";
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <Card className="glass-panel" variant="borderless" style={{ marginBottom: "24px", padding: 0 }}>
        <Tabs
          defaultActiveKey="table"
          tabBarStyle={{ padding: "16px 24px 0", margin: 0 }}
          items={[
            {
              key: "table",
              label: <span><ShopOutlined /> Danh sách</span>,
              children: (
                <div style={{ padding: "0 24px 24px" }}>
                  <Row gutter={[16, 16]} align="middle" style={{ marginBottom: "16px" }}>
                    <Col xs={24} md={6}>
                      <Input
                        placeholder="Tìm kiếm tên gian hàng..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={handleSearch}
                        prefix={<SearchOutlined />}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <Select placeholder="Chọn Tầng" value={floor} onChange={setFloor} style={{ width: "100%" }} allowClear>
                        <Option value={1}>Tầng 1</Option>
                        <Option value={2}>Tầng 2</Option>
                        <Option value={3}>Tầng 3</Option>
                        <Option value={4}>Tầng 4</Option>
                      </Select>
                    </Col>
                    <Col xs={12} md={4}>
                      <Select placeholder="Chọn Khu vực" value={zone} onChange={setZone} style={{ width: "100%" }} allowClear>
                        <Option value="A">Khu A</Option>
                        <Option value="B">Khu B</Option>
                        <Option value="C">Khu C</Option>
                        <Option value="D">Khu D</Option>
                      </Select>
                    </Col>
                    <Col xs={12} md={4}>
                      <Select placeholder="Chọn Trạng thái" value={status} onChange={setStatus} style={{ width: "100%" }} allowClear>
                        <Option value="available">Còn trống</Option>
                        <Option value="rented">Đang thuê</Option>
                        <Option value="maintenance">Bảo trì</Option>
                      </Select>
                    </Col>
                    <Col xs={12} md={6} style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <Button onClick={handleClearFilters}>Đặt lại</Button>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ background: "var(--primary-color)", borderColor: "var(--primary-color)" }}>
                        Thêm gian hàng
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
                      onChange: (p, ps) => { setPage(p); setPageSize(ps); }
                    }}
                  />
                </div>
              )
            },
            {
              key: "map",
              label: <span><EnvironmentOutlined /> Bản đồ</span>,
              children: <MallMap />
            }
          ]}
        />
      </Card>

      <Modal
        title={editingId ? "Cập nhật thông tin gian hàng" : "Thêm gian hàng mới"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu lại"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ status: "available" }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Tên gian hàng" rules={[{ required: true, message: "Nhập tên gian hàng!" }]}>
                <Input placeholder="Ví dụ: Gian hàng A101" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái ban đầu" rules={[{ required: true }]}>
                <Select>
                  <Option value="available">Còn trống</Option>
                  <Option value="rented">Đang thuê</Option>
                  <Option value="maintenance">Bảo trì</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="floor" label="Tầng" rules={[{ required: true, message: "Chọn tầng!" }]}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="zone" label="Khu vực" rules={[{ required: true, message: "Khu vực!" }]}>
                <Input placeholder="A, B, C..." maxLength={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="area" label="Diện tích (m²)" rules={[{ required: true, message: "Nhập diện tích!" }]}>
                <InputNumber min={1} style={{ width: "100%" }} placeholder="m2" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="price" label="Giá thuê định kỳ hàng tháng (VND)" rules={[{ required: true, message: "Nhập giá thuê!" }]}>
            <InputNumber min={1000} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Hình ảnh gian hàng">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={handleUploadChange}
              customRequest={customUpload}
              maxCount={5}
            >
              {fileList.length < 5 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Tải lên</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item name="description" label="Mô tả đặc điểm gian hàng">
            <TextArea rows={3} placeholder="Mô tả chi tiết diện tích, hướng, đặc điểm hạ tầng gian hàng..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
