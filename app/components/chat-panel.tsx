import { useEffect, useRef, useState } from 'react';
import { useGameContext } from '~/utils/game-provider';

type ChatPanelProps = {
  onClose?: (value: false) => void;
};
export function ChatPanel({ onClose }: ChatPanelProps) {
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const [chatScrollLocked, setChatScrollLocked] = useState(false);
  const {
    act,
    gameState: { chats },
  } = useGameContext();

  // Scroll chat to bottom unless user scrolled up
  useEffect(() => {
    if (chatPanelRef.current && !chatScrollLocked) {
      chatPanelRef.current.scrollTop = chatPanelRef.current.scrollHeight;
    }
  }, [chats, chatScrollLocked]);

  // Send chat message
  async function sendChat(message: string) {
    if (!message.trim()) return;
    await act({
      intent: 'chat',
      parameters: {
        message: message.trim(),
        timestamp: Date.now(),
      },
    });
  }

  return (
    <div
      className={
        `fixed z-50 flex flex-col left-0 overflow-hidden ` +
        `bg-[#FBF0E3] border-r-2 border-[#E85E37] shadow-[4px_0_24px_rgba(132,38,22,0.13)] transition-all duration-200 ` +
        `w-full rounded-none ` +
        `sm:w-[340px] sm:h-[calc(100vh-64px-88px)] sm:top-[64px] sm:bottom-auto sm:rounded-tr-[18px] sm:rounded-br-[18px]`
      }
      style={{
        // Mobile: use dvh and safe-area-inset for height and padding
        top: 'env(safe-area-inset-top, 0px)',
        left: 'env(safe-area-inset-left, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        height:
          'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 88px)',
        // Desktop overrides
        ...(window.innerWidth >= 640
          ? {
              top: 64,
              left: 0,
              right: 'auto',
              bottom: 'auto',
              height: 'calc(100vh - 64px - 88px)',
            }
          : {}),
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'max(16px, env(safe-area-inset-top, 0px)) 16px 16px 16px',
          borderBottom: '2px solid #E2BFA3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FBF0E3',
          borderTopLeftRadius: 18,
        }}
      >
        <span style={{ color: '#842616', fontWeight: 700, fontSize: 18 }}>
          Chat
        </span>
        <button
          onClick={() => onClose?.(false)}
          aria-label="Close chat"
          style={{
            background: 'none',
            border: 'none',
            color: '#E85E37',
            fontSize: 22,
            cursor: 'pointer',
            fontWeight: 700,
            borderRadius: 8,
            padding: 4,
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#F08B4C')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
        >
          &times;
        </button>
      </div>
      {/* Chat messages */}
      <div
        ref={chatPanelRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          background: '#FFF8F3',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          setChatScrollLocked(
            el.scrollHeight - el.scrollTop - el.clientHeight > 40,
          );
        }}
      >
        {(chats || []).map((chat, i) => (
          <div
            key={chat.id || i}
            style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 18,
                borderRadius: 8,
                background: chat.color,
                border: '2px solid #E2BFA3',
                marginBottom: 2,
              }}
            />
            <div
              style={{
                background: '#FBF0E3',
                borderRadius: 10,
                padding: '6px 12px',
                boxShadow: '0 1px 4px rgba(132,38,22,0.07)',
                flex: 1,
                maxWidth: '100%',
              }}
            >
              <div style={{ color: '#842616', fontWeight: 700, fontSize: 13 }}>
                {chat.name}
              </div>
              <div
                style={{
                  color: '#842616',
                  fontSize: 15,
                  wordBreak: 'break-word',
                }}
              >
                {chat.message}
              </div>
              <div style={{ color: '#B98A68', fontSize: 11, marginTop: 2 }}>
                {new Date(chat.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <form
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 12,
          borderTop: '2px solid #E2BFA3',
          background: '#FBF0E3',
          borderBottomRightRadius: 18,
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          const input = chatInputRef.current;
          if (input && input.value.trim()) {
            await sendChat(input.value);
            input.value = '';
            setTimeout(() => {
              if (chatPanelRef.current)
                chatPanelRef.current.scrollTop =
                  chatPanelRef.current.scrollHeight;
            }, 50);
          }
        }}
      >
        <input
          ref={chatInputRef}
          type="text"
          placeholder="Type a message..."
          maxLength={200}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #E2BFA3',
            background: '#FFF',
            color: '#842616',
            fontSize: 15,
            marginRight: 8,
          }}
          autoComplete="off"
          onFocus={() =>
            setTimeout(() => {
              if (chatPanelRef.current && !chatScrollLocked)
                chatPanelRef.current.scrollTop =
                  chatPanelRef.current.scrollHeight;
            }, 50)
          }
        />
        <button
          type="submit"
          style={{
            background: '#E85E37',
            color: '#FBF0E3',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 16,
            padding: '8px 18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#DF4A2B')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#E85E37')}
        >
          Send
        </button>
      </form>
    </div>
  );
}
