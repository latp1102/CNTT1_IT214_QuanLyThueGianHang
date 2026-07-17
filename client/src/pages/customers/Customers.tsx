import { useState, useEffect } from "react";
import { Table, Card, Button, Input, Tag, Space, Modal, Form, Select, Row, Col, Avatar, Upload, Image, Tooltip } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, PictureOutlined, UploadOutlined, EyeOutlined } from "@ant-design/icons";
import axiosClient from "../../apis/axiosClient";

const { Option } = Select;

export default function Customers() {
  const message = useMessage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerImages, setCustomerImages] = useState<string[]>([]);
  const [imagesUploading, setImagesUploading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      if (status) params.status = status;

      const res: any = await axiosClient.get("/customers", { params });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách khách thuê.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, pageSize, status]);

  const handleSearch = () => {
    setPage(1);
    fetchCustomers();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus(undefined);
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa khách thuê",
      content: "Bạn có chắc chắn muốn xóa khách thuê này? Bạn không thể xóa nếu khách đang có hợp đồng có hiệu lực.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axiosClient.delete(`/customers/${id}`);
          message.success("Xóa thông tin khách thuê thành công!");
          fetchCustomers();
        } catch (error: any) {
          message.error(error.message || "Không thể xóa khách thuê. Vui lòng thanh lý hợp đồng của khách trước.");
        }
      }
    });
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setAvatarUrl("");
    setModalOpen(true);
  };

  const handleOpenEditModal = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setAvatarUrl(record.avatar || "");
    setModalOpen(true);
  };

  const handleOpenImagesModal = async (record: any) => {
    setSelectedCustomer(record);
    setCustomerImages([]);
    setImagesModalOpen(true);
    try {
      const res: any = await axiosClient.get(`/customers/${record.id}/images`);
      setCustomerImages(res.data.images?.map((img: any) => img.imageUrl) || []);
    } catch {
      message.error("Không thể tải hình ảnh.");
    }
  };

  const customUpload = async (options: any) => {
    const { onSuccess, onError, file } = options;
    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res: any = await axiosClient.post("/customers/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const uploadedUrl = res.data;
      setAvatarUrl(uploadedUrl);
      form.setFieldsValue({ avatar: uploadedUrl });
      onSuccess(uploadedUrl);
    } catch (err: any) {
      message.error(err.message || "Không thể tải lên hình ảnh đại diện.");
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImages = async (options: any) => {
    const { onSuccess, onError, file } = options;
    setImagesUploading(true);
    const formData = new FormData();
    formData.append("images", file);
    formData.append("customerId", String(selectedCustomer.id));

    try {
      const res: any = await axiosClient.post("/customers/upload-images", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const urls: string[] = res.data;
      setCustomerImages(prev => [...urls, ...prev]);
      onSuccess(urls);
    } catch (err: any) {
      message.error(err.message || "Không thể tải lên hình ảnh.");
      onError(err);
    } finally {
      setImagesUploading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      if (editingId) {
        await axiosClient.put(`/customers/${editingId}`, values);
        message.success("Cập nhật thông tin khách thuê thành công!");
      } else {
        await axiosClient.post("/customers", values);
        message.success("Thêm khách thuê mới thành công!");
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      message.error(error.message || "Lưu thông tin khách thuê thất bại.");
    }
  };

  const columns = [
    {
      title: "Khách thuê",
      key: "customer",
      render: (_: any, record: any) => (
        <Space>
          <Avatar src={record.avatar || undefined} icon={!record.avatar && <UserOutlined />} />
          <div>
            <div style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{record.name}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{record.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone"
    },
    {
      title: "Số CCCD",
      dataIndex: "idCard",
      key: "idCard"
    },
    {
      title: "Doanh nghiệp",
      dataIndex: "company",
      key: "company",
      render: (val: string) => val || <span style={{ color: "var(--text-muted)" }}>Cá nhân</span>
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      ellipsis: true
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (val: string) => (
        <Tag color={val === "active" ? "green" : "red"}>
          {val === "active" ? "Hoạt động" : "Tạm khóa"}
        </Tag>
      )
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Tooltip title="Xem ảnh">
            <Button type="text" icon={<PictureOutlined />} onClick={() => handleOpenImagesModal(record)} />
          </Tooltip>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <Card title="Quản lý Khách thuê (Đối tác)" className="glass-panel" variant="borderless" style={{ marginBottom: "24px" }}>
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: "16px" }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo tên, email, số điện thoại, công ty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select placeholder="Trạng thái" value={status} onChange={setStatus} style={{ width: "100%" }} allowClear>
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Tạm khóa</Option>
            </Select>
          </Col>
          <Col xs={12} md={10} style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button onClick={handleClearFilters}>Đặt lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ background: "var(--primary-color)", borderColor: "var(--primary-color)" }}>
              Thêm khách thuê
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
        title={editingId ? "Cập nhật thông tin khách thuê" : "Thêm khách thuê mới"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu lại"
        cancelText="Hủy"
        width={650}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ status: "active" }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Họ và tên khách thuê" rules={[{ required: true, message: "Nhập họ và tên đối tác!" }]}>
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idCard" label="Số CCCD / Hộ chiếu" rules={[{ required: true, message: "Nhập số CCCD/Hộ chiếu!" }]}>
                <Input placeholder="Số căn cước công dân" maxLength={12} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Địa chỉ Email" rules={[{ required: true, type: "email", message: "Nhập địa chỉ email hợp lệ!" }]}>
                <Input placeholder="nva@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: "Nhập số điện thoại liên hệ!" }]}>
                <Input placeholder="0912345678" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="company" label="Tên doanh nghiệp / Hộ kinh doanh">
                <Input placeholder="Công ty TNHH Thương mại A (Để trống nếu là cá nhân)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái khách thuê" rules={[{ required: true }]}>
                <Select>
                  <Option value="active">Hoạt động</Option>
                  <Option value="inactive">Tạm khóa</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Địa chỉ thường trú">
            <Input placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP" />
          </Form.Item>

          <Form.Item name="avatar" label="Ảnh đại diện (URL)" style={{ display: "none" }}>
            <Input />
          </Form.Item>

          <Form.Item label="Hình ảnh đại diện (Tải lên)">
            <Upload
              name="avatar"
              listType="picture-card"
              showUploadList={false}
              customRequest={customUpload}
              beforeUpload={(file) => {
                const isLt2M = file.size / 1024 / 1024 < 2;
                if (!isLt2M) {
                  message.error("Kích thước hình ảnh phải nhỏ hơn 2MB!");
                }
                return isLt2M;
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "8px", objectFit: "cover" }} />
              ) : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>{uploading ? "Đang tải..." : "Tải lên"}</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <PictureOutlined />
            Hình ảnh gian hàng - {selectedCustomer?.name}
          </Space>
        }
        open={imagesModalOpen}
        onCancel={() => setImagesModalOpen(false)}
        footer={null}
        width={700}
      >
        <Upload
          name="images"
          listType="picture-card"
          showUploadList={false}
          customRequest={handleUploadImages}
          beforeUpload={(file) => {
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
              message.error("Kích thước ảnh phải nhỏ hơn 5MB!");
            }
            return isLt5M;
          }}
          style={{ marginBottom: 16 }}
        >
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>{imagesUploading ? "Đang tải..." : "Tải ảnh"}</div>
          </div>
        </Upload>

        <div style={{ marginTop: 16 }}>
          {customerImages.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <PictureOutlined style={{ fontSize: 48, opacity: 0.3 }} />
              <p>Chưa có hình ảnh nào. Hãy tải lên ảnh mặt bằng / gian hàng của khách thuê.</p>
            </div>
          ) : (
            <Image.PreviewGroup>
              <Row gutter={[12, 12]}>
                {customerImages.map((url, idx) => (
                  <Col key={idx} span={8}>
                    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <Image
                        src={url}
                        alt={`Customer image ${idx + 1}`}
                        style={{ width: "100%", height: 160, objectFit: "cover" }}
                        preview={{ mask: <EyeOutlined /> }}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </Image.PreviewGroup>
          )}
        </div>
      </Modal>
    </div>
  );
}
