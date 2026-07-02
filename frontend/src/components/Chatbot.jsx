import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Xin chào! Gõ "giúp" để xem các lệnh hỗ trợ.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const { reply } = await sendChatMessage(userMsg);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'bot', text: `Lỗi: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.text.split('\n').map((line, j) => (
              <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>
            ))}
          </div>
        ))}
        {loading && <div className="chat-bubble bot">Đang xử lý...</div>}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Hỏi: "độ ẩm đất", "bật bơm", "trạng thái"...'
        />
        <button type="submit" disabled={loading}>Gửi</button>
      </form>
    </div>
  );
}
