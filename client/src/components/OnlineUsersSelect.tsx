import { Select, Space, Badge } from "antd";
import { useVideoCall } from "./VideoCallContext";

export function OnlineUsersSelect() {
  const { onlineUsers, startCall } = useVideoCall();

  return (
    <Select
      placeholder="Gọi điện..."
      showSearch
      style={{ minWidth: 140 }}
      styles={{ popup: { root: { minWidth: 200 } } }}
      value={undefined}
      onChange={(val: string) => {
        const [id, name] = val.split("|");
        startCall(parseInt(id), name);
      }}
      notFoundContent="Không có người dùng trực tuyến"
      optionFilterProp="label"
    >
      {onlineUsers.map((u) => (
        <Select.Option key={u.userId} value={`${u.userId}|${u.username}`} label={u.username}>
          <Space>
            <Badge status="success" />
            {u.username}
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
}
