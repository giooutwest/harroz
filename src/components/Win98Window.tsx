import { useState, useRef, useCallback, ReactNode, CSSProperties } from "react";

interface Win98WindowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
  width?: number | string;
  minWidth?: number;
  style?: CSSProperties;
  menuBar?: ReactNode;
}

const Win98Window = ({
  title,
  icon = "📋",
  children,
  onClose,
  initialX = 40,
  initialY = 40,
  width = 340,
  minWidth = 200,
  style,
  menuBar,
}: Win98WindowProps) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from title bar
    if ((e.target as HTMLElement).closest(".win98-titlebar-btn")) return;
    dragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, me.clientX - offset.current.x),
        y: Math.max(0, me.clientY - offset.current.y),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  // Touch dragging
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest(".win98-titlebar-btn")) return;
    const touch = e.touches[0];
    dragging.current = true;
    offset.current = {
      x: touch.clientX - pos.x,
      y: touch.clientY - pos.y,
    };

    const onMove = (te: TouchEvent) => {
      if (!dragging.current) return;
      const t = te.touches[0];
      setPos({
        x: Math.max(0, t.clientX - offset.current.x),
        y: Math.max(0, t.clientY - offset.current.y),
      });
    };
    const onEnd = () => {
      dragging.current = false;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [pos]);

  return (
    <div
      ref={windowRef}
      className="win98-window"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width,
        minWidth,
        zIndex: 1000,
        ...style,
      }}
    >
      {/* Title Bar */}
      <div
        className="win98-titlebar"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{ cursor: "default" }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </span>
        <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
          <button
            className="win98-btn win98-titlebar-btn"
            onClick={onClose}
            style={{ minWidth: 16, width: 16, height: 14, padding: 0, fontSize: 9, lineHeight: "12px" }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Optional menu bar */}
      {menuBar && (
        <div className="win98-menubar">{menuBar}</div>
      )}

      {/* Content */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default Win98Window;
