import { useState, useEffect } from "react";
import { Table, Card, Button, Input, Tag, Space, Modal, Form, Select, Row, Col, Switch, Tabs } from "antd";
import { useMessage } from "../../hooks/useMessage";
import { SearchOutlined, SafetyOutlined, DeleteOutlined } from "@ant-design/icons";
import axiosClient from "../../apis/axiosClient";

const { Option } = Select;

export default function Accounts() {
  const message = useMessage();
  const [activeTab, setActiveTab] = useState("1");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Roles & Permissions list
  const [roles, setRoles] = useState([]);

  // Modal control
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm] = Form.useForm();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      const res: any = await axiosClient.get("/users", { params });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách tài khoản hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesAndPermissions = async () => {
    try {
      const [resRoles] = await Promise.all([
        axiosClient.get("/users/roles"),
        axiosClient.get("/users/permissions")
      ]);
      setRoles(resRoles.data);
    } catch (error) {
      console.error("Lỗi khi tải thông tin phân quyền:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "1") {
      fetchUsers();
    } else {
      fetchRolesAndPermissions();
    }
  }, [page, pageSize, activeTab]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleStatusChange = async (id: number, checked: boolean) => {
    try {
      const status = checked ? "active" : "inactive";
      await axiosClient.patch(`/users/${id}/status`, { status });
      message.success("Cập nhật trạng thái tài khoản thành công!");
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || "Lỗi cập nhật trạng thái hoạt động tài khoản.");
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa tài khoản",
      content: "Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này không? Mọi dữ liệu liên quan sẽ bị xóa bỏ.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axiosClient.delete(`/users/${id}`);
          message.success("Xóa tài khoản thành công!");
          fetchUsers();
        } catch (error: any) {
          message.error(error.message || "Xóa tài khoản thất bại.");
        }
      }
    });
  };

  const handleOpenRoleModal = (record: any) => {
    setSelectedUserId(record.id);
    fetchRolesAndPermissions();
    roleForm.resetFields();
    roleForm.setFieldsValue({
      username: record.username,
      roleIds: record.userRoles.map((ur: any) => ur.role.id)
    });
    setRoleModalOpen(true);
  };

  const handleAssignRoles = async (values: any) => {
    if (!selectedUserId) return;
    try {
      await axiosClient.post(`/users/${selectedUserId}/roles`, {
        roleIds: values.roleIds
      });
      message.success("Phân nhóm vai trò cho tài khoản thành công!");
      setRoleModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || "Cập nhật nhóm vai trò tài khoản thất bại.");
    }
  };

  const userColumns = [
    {
      title: "Tên tài khoản",
      dataIndex: "username",
      key: "username",
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: "Địa chỉ Email",
      dataIndex: "email",
      key: "email"
    },
    {
      title: "Nhóm vai trò",
      dataIndex: "userRoles",
      key: "roles",
      render: (val: any) => (
        <Space size={[0, 4]} wrap>
          {val.map((ur: any) => (
            <Tag color={ur.role.name === "admin" ? "red" : ur.role.name === "manager" ? "orange" : "blue"} key={ur.role.id}>
              {ur.role.name.toUpperCase()}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: "Kích hoạt",
      key: "status",
      render: (_: any, record: any) => (
        <Switch
          checked={record.status === "active"}
          onChange={(checked) => handleStatusChange(record.id, checked)}
        />
      )
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<SafetyOutlined />} onClick={() => handleOpenRoleModal(record)} title="Phân quyền nhóm" />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Xóa tài khoản" />
        </Space>
      )
    }
  ];

  const roleColumns = [
    {
      title: "Nhóm vai trò",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong style={{ textTransform: "uppercase", color: "var(--primary-color)" }}>{text}</strong>
    },
    {
      title: "Mô tả vai trò",
      dataIndex: "description",
      key: "description"
    },
    {
      title: "Quyền hạn chi tiết được gán",
      dataIndex: "rolePermissions",
      key: "permissions",
      render: (val: any) => (
        <Space size={[0, 4]} wrap>
          {val.map((rp: any) => (
            <Tag key={rp.permission.id}>{rp.permission.name}</Tag>
          ))}
        </Space>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <Card title="Quản lý Phân quyền tài khoản hệ thống" className="glass-panel" variant="borderless">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Danh sách người dùng" key="1">
            <Row gutter={[16, 16]} style={{ marginBottom: "16px" }} align="middle">
              <Col xs={18} md={8}>
                <Input
                  placeholder="Tìm tên tài khoản hoặc email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onPressEnter={handleSearch}
                  prefix={<SearchOutlined />}
                />
              </Col>
              <Col xs={6} md={4}>
                <Button type="primary" onClick={handleSearch} style={{ background: "var(--primary-color)", borderColor: "var(--primary-color)" }}>
                  Tìm kiếm
                </Button>
              </Col>
            </Row>

            <Table
              columns={userColumns}
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
          </Tabs.TabPane>

          <Tabs.TabPane tab="Quyền hạn nhóm vai trò" key="2">
            <Table
              columns={roleColumns}
              dataSource={roles}
              rowKey="id"
              pagination={false}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <Modal
        title="Phân vai trò tài khoản người dùng"
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={() => roleForm.submit()}
        okText="Cập nhật vai trò"
        cancelText="Hủy"
        width={450}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleAssignRoles}>
          <Form.Item name="username" label="Tên tài khoản người dùng">
            <Input disabled />
          </Form.Item>

          <Form.Item name="roleIds" label="Chọn nhóm vai trò áp dụng" rules={[{ required: true, message: "Chọn ít nhất một vai trò!" }]}>
            <Select mode="multiple" placeholder="Chọn vai trò...">
              {roles.map((r: any) => (
                <Option key={r.id} value={r.id}>
                  {r.name.toUpperCase()} - {r.description}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
