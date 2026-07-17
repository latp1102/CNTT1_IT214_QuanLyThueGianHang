import { useState, useRef, useEffect } from "react";
import {
  Button,
  Input,
  Tooltip,
  Typography,
} from "antd";
import { useMessage } from "../hooks/useMessage";
import {
  MessageOutlined,
  CloseOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  CopyOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import axiosClient from "../apis/axiosClient";

const { Text } = Typography;

interface Message {
  role: "user" | "bot";
  content: string;
}

const WELCOME_MSG: Message = {
  role: "bot",
  content: `👋 **Chào bạn!** Tôi là trợ lý AI của Hệ thống Quản lý Thuê Gian hàng.

Tôi có thể giúp bạn:
📋 Tra cứu thông tin gian hàng, hợp đồng, hóa đơn
📊 Báo cáo doanh thu & phân tích
💡 Hướng dẫn sử dụng hệ thống
🔍 Tìm kiếm thông tin hoặc dữ liệu

*Hãy đặt câu hỏi cho tôi nhé!*`,
};

const QUICK_QUESTIONS = [
  "Có gian hàng nào còn trống?",
  "Tình hình doanh thu hiện tại?",
  "Hợp đồng đang hoạt động?",
  "Có hóa đơn quá hạn không?",
];

// Typing Animation Component
const TypingIndicator = () => (
  <div
    style={{
      display: "flex",
      gap: "4px",
      alignItems: "center",
      padding: "8px 0",
    }}
  >
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "#4f46e5",
          animation: `bounce 1.4s infinite`,
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes bounce {
        0%, 80%, 100% { opacity: 0.5; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-8px); }
      }
    `}</style>
  </div>
);

// Extract suggested follow-up questions from bot response
const extractSuggestedQuestions = (content: string): string[] => {
  const questions: string[] = [];

  // Look for common keywords to suggest follow-ups
  if (content.toLowerCase().includes("gian hàng")) {
    questions.push("Giá gian hàng như thế nào?");
  }
  if (content.toLowerCase().includes("hợp đồng")) {
    questions.push("Khi nào hợp đồng hết hạn?");
  }
  if (
    content.toLowerCase().includes("thanh toán") ||
    content.toLowerCase().includes("hóa đơn")
  ) {
    questions.push("Có hóa đơn nào chưa thanh toán?");
  }
  if (
    content.toLowerCase().includes("khách") ||
    content.toLowerCase().includes("customer")
  ) {
    questions.push("Khách nào có hợp đồng sắp hết hạn?");
  }

  return questions.slice(0, 2); // Return max 2 suggestions
};

export default function ChatBot() {
  const message = useMessage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (msg?: string) => {
    const text = (msg || input).trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res: any = await axiosClient.post("/chat/message", {
        message: text,
        sessionId,
      });
      const reply =
        res.data?.reply ||
        res.reply ||
        "Không nhận được phản hồi từ server.";

      setMessages((prev) => [...prev, { role: "bot", content: reply }]);

      // Extract and set suggested follow-up questions
      const suggestions = extractSuggestedQuestions(reply);
      setSuggestedQuestions(suggestions);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "❌ Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.",
        },
      ]);
      setSuggestedQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("Đã sao chép!");
  };

  const renderMarkdown = (content: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const regex = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\*[^*\n]+\*)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </span>,
        );
      }

      const matched = match[0];
      if (matched.startsWith("**") && matched.endsWith("**")) {
        parts.push(
          <strong key={`bold-${match.index}`}>{matched.slice(2, -2)}</strong>,
        );
      } else if (matched.startsWith("_") && matched.endsWith("_")) {
        parts.push(
          <em key={`italic-${match.index}`}>{matched.slice(1, -1)}</em>,
        );
      } else if (matched.startsWith("`") && matched.endsWith("`")) {
        parts.push(
          <code
            key={`code-${match.index}`}
            style={{
              background: "#f0f0f0",
              padding: "2px 6px",
              borderRadius: 3,
              fontSize: 12,
            }}
          >
            {matched.slice(1, -1)}
          </code>,
        );
      } else if (matched.startsWith("*") && matched.endsWith("*")) {
        parts.push(<em key={`em-${match.index}`}>{matched.slice(1, -1)}</em>);
      }

      lastIndex = match.index + matched.length;
    }

    if (lastIndex < content.length) {
      parts.push(<span key={`text-end`}>{content.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : content;
  };

  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("```") && line.endsWith("```")) {
        const code = line.slice(3, -3);
        return (
          <div
            key={i}
            style={{
              background: "#f5f5f5",
              borderRadius: 8,
              padding: "10px 12px",
              margin: "6px 0",
              fontSize: 12,
              fontFamily: "monospace",
              border: "1px solid #e0e0e0",
              overflow: "auto",
            }}
          >
            {code}
          </div>
        );
      }
      return (
        <div key={i} style={{ margin: "4px 0" }}>
          {renderMarkdown(line) || <br />}
        </div>
      );
    });
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            right: 24,
            width: 380,
            height: 520,
            background: "var(--bg-card)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "fadeInUp 0.25s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RobotOutlined style={{ fontSize: 20 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Trợ lý AI</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Hỗ trợ 24/7</div>
              </div>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined style={{ color: "#fff" }} />}
              onClick={() => setOpen(false)}
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "flex-start",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background:
                      msg.role === "user" ? "var(--primary)" : "#f0f0f0",
                    color: msg.role === "user" ? "#fff" : "#666",
                    fontSize: 12,
                  }}
                >
                  {msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    maxWidth: "75%",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius:
                        msg.role === "user"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      background:
                        msg.role === "user"
                          ? "var(--primary)"
                          : "var(--bg-sidebar)",
                      color: msg.role === "user" ? "#fff" : "var(--text)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {renderContent(msg.content)}
                  </div>
                  {msg.role === "bot" && (
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined style={{ fontSize: 12 }} />}
                      onClick={() => copyToClipboard(msg.content)}
                      style={{
                        height: 20,
                        padding: "0 8px",
                        fontSize: 11,
                        alignSelf: "flex-start",
                        color: "#999",
                      }}
                    />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f0f0f0",
                    color: "#666",
                    fontSize: 12,
                  }}
                >
                  <RobotOutlined />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 16,
                    background: "var(--bg-sidebar)",
                  }}
                >
                  <TypingIndicator />
                </div>
              </div>
            )}

            {!loading && suggestedQuestions.length > 0 && (
              <div style={{ marginTop: 12, padding: "0 4px" }}>
                <Text
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  💬 Câu hỏi tiếp theo:
                </Text>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {suggestedQuestions.map((q, idx) => (
                    <Button
                      key={idx}
                      type="default"
                      size="small"
                      block
                      onClick={() => handleSend(q)}
                      style={{
                        fontSize: 11,
                        height: 28,
                        textAlign: "left",
                        borderColor: "#d9d9d9",
                        color: "var(--text)",
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  💡 Câu hỏi nhanh:
                </Text>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {QUICK_QUESTIONS.map((q, i) => (
                    <div
                      key={i}
                      onClick={() => handleSend(q)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        cursor: "pointer",
                        border: "1px solid var(--border)",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--primary)";
                        e.currentTarget.style.color = "#fff";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "var(--primary-light)";
                        e.currentTarget.style.color = "var(--primary)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: "8px 12px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi..."
              variant="borderless"
              disabled={loading}
              suffix={
                <SendOutlined
                  style={{
                    color: loading ? "#ccc" : "var(--primary)",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 16,
                  }}
                  onClick={() => handleSend()}
                />
              }
              style={{
                background: "var(--bg-sidebar)",
                borderRadius: 12,
                padding: "6px 12px",
                flex: 1,
              }}
            />
            <Tooltip title="Xóa lịch sử chat">
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={() => {
                  setMessages([WELCOME_MSG]);
                  setSuggestedQuestions([]);
                  message.success("Đã xóa lịch sử");
                }}
                style={{ height: 32 }}
              />
            </Tooltip>
          </div>
        </div>
      )}

      <Tooltip title="Trợ lý AI" placement="left">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={open ? <CloseOutlined /> : <MessageOutlined />}
          onClick={() => setOpen(!open)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            width: 52,
            height: 52,
            boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            border: "none",
          }}
        />
      </Tooltip>
    </>
  );
}
