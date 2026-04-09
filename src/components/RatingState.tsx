import { useState, useRef, useCallback, useEffect } from "react";

interface RatingStateProps {
  thumbnailUrl: string;
  onSubmit: (rating: number) => void;
  isSubmitting: boolean;
}

// Arc parameters
const CX = 160;          // center x of the arc
const CY = 180;          // center y (below the midpoint — creates a good half-dome)
const R = 130;           // arc radius
const START_ANGLE = 200; // degrees (pointing lower-left)
const END_ANGLE = 340;   // degrees (pointing lower-right)

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Map rating 1–10 to angle along the arc
function ratingToAngle(rating: number): number {
  return START_ANGLE + ((rating - 1) / 9) * (END_ANGLE - START_ANGLE);
}

function angleToRating(angle: number): number {
  const clamped = Math.max(START_ANGLE, Math.min(END_ANGLE, angle));
  return Math.round(1 + ((clamped - START_ANGLE) / (END_ANGLE - START_ANGLE)) * 9);
}

function getRatingColor(r: number): string {
  const colors = [
    "#cc0000", "#dd2200", "#dd4400", "#cc7700", "#bbaa00",
    "#88bb00", "#55aa00", "#229900", "#008800", "#006600",
  ];
  return colors[r - 1] ?? "#000080";
}

function getRatingLabel(r: number): string {
  const labels = [
    "TERRIBLE", "BAD", "ROUGH", "MEH", "OKAY",
    "DECENT", "GOOD", "GREAT", "EXCELLENT", "PERFECT",
  ];
  return labels[r - 1] ?? "";
}

// Describe the arc path (just the track)
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polarToXY(startDeg, r, cx, cy);
  const e = polarToXY(endDeg, r, cx, cy);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

// Describe filled arc from start to current angle
function describeFilledArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  if (endDeg <= startDeg) return "";
  const s = polarToXY(startDeg, r, cx, cy);
  const e = polarToXY(endDeg, r, cx, cy);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

const TICK_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const RatingState = ({ thumbnailUrl, onSubmit, isSubmitting }: RatingStateProps) => {
  const [rating, setRating] = useState(5);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const angleFromEvent = useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return ratingToAngle(rating);
    const rect = svg.getBoundingClientRect();
    const scale = 320 / rect.width; // SVG viewBox is 320 wide
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;
    const dx = x - CX;
    const dy = y - CY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Normalize to 0–360
    if (angle < 0) angle += 360;
    return angle;
  }, [rating]);

  const updateRatingFromAngle = useCallback((angle: number) => {
    // Clamp to the valid arc range
    let a = angle;
    // Handle wrapping: angles near 0 (e.g., 350) map close to END_ANGLE
    if (a < 100) a += 360; // helps when dragging past 360/0
    const clamped = Math.max(START_ANGLE, Math.min(END_ANGLE + 360 - 360, a));
    // Re-map back
    const normalizedAngle = clamped > END_ANGLE ? END_ANGLE : clamped < START_ANGLE ? START_ANGLE : clamped;
    setRating(angleToRating(normalizedAngle));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    updateRatingFromAngle(angleFromEvent(e.clientX, e.clientY));
    e.preventDefault();
  }, [angleFromEvent, updateRatingFromAngle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    updateRatingFromAngle(angleFromEvent(e.clientX, e.clientY));
  }, [angleFromEvent, updateRatingFromAngle]);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    const t = e.touches[0];
    updateRatingFromAngle(angleFromEvent(t.clientX, t.clientY));
  }, [angleFromEvent, updateRatingFromAngle]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const t = e.touches[0];
    updateRatingFromAngle(angleFromEvent(t.clientX, t.clientY));
  }, [angleFromEvent, updateRatingFromAngle]);

  const handleTouchEnd = useCallback(() => { isDragging.current = false; }, []);

  useEffect(() => {
    const up = () => { isDragging.current = false; };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, []);

  const knobAngle = ratingToAngle(rating);
  const knobPos = polarToXY(knobAngle, R, CX, CY);
  const color = getRatingColor(rating);
  const filledEnd = knobAngle;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#C0C0C0",
      }}
    >
      {/* Frozen thumbnail as background (blurred) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${thumbnailUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px) brightness(0.3)",
          zIndex: 0,
        }}
      />

      {/* Thumbnail thumbnail (small, top) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "20px 20px 0",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className="win98-window"
          style={{ width: 160, padding: 3 }}
        >
          <div className="win98-titlebar" style={{ fontSize: 10, height: 18, padding: "1px 4px" }}>
            <span>📷 Final Frame (No Re-Watch)</span>
          </div>
          <img
            src={thumbnailUrl}
            style={{ width: "100%", display: "block", aspectRatio: "9/16", objectFit: "cover" }}
            alt="Final frame"
          />
        </div>
      </div>

      {/* Rating label */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          marginTop: 12,
          fontFamily: "'VT323', monospace",
          fontSize: 36,
          color: color,
          textShadow: "2px 2px 0 rgba(0,0,0,0.8)",
          letterSpacing: 3,
        }}
      >
        {getRatingLabel(rating)}
        <div style={{ fontSize: 52, lineHeight: 0.9 }}>{rating}</div>
        <div style={{ fontSize: 16, color: "#ccc", letterSpacing: 2 }}>/ 10</div>
      </div>

      {/* Half-dial SVG */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "center",
          marginTop: 4,
          flex: 1,
          alignItems: "flex-start",
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 320 220"
          width="100%"
          style={{ maxWidth: 360, cursor: "grab", touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background track */}
          <path
            d={describeArc(CX, CY, R, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={18}
            strokeLinecap="butt"
          />
          {/* Dark track outline */}
          <path
            d={describeArc(CX, CY, R, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={22}
            strokeLinecap="butt"
          />
          {/* Background track fill */}
          <path
            d={describeArc(CX, CY, R, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="#333"
            strokeWidth={18}
            strokeLinecap="butt"
          />
          {/* Filled arc up to rating */}
          <path
            d={describeFilledArc(CX, CY, R, START_ANGLE, filledEnd)}
            fill="none"
            stroke={color}
            strokeWidth={18}
            strokeLinecap="butt"
          />

          {/* Tick marks */}
          {TICK_VALUES.map(v => {
            const ang = ratingToAngle(v);
            const inner = polarToXY(ang, R - 14, CX, CY);
            const outer = polarToXY(ang, R + 14, CX, CY);
            const label = polarToXY(ang, R - 30, CX, CY);
            return (
              <g key={v}>
                <line
                  x1={inner.x} y1={inner.y}
                  x2={outer.x} y2={outer.y}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={v === rating ? 3 : 1.5}
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill={v === rating ? color : "rgba(255,255,255,0.5)"}
                  fontSize={v === rating ? 14 : 11}
                  fontFamily="'VT323', monospace"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Knob */}
          <circle
            cx={knobPos.x}
            cy={knobPos.y}
            r={14}
            fill="#C0C0C0"
            style={{
              filter: "drop-shadow(1px 1px 0 #0a0a0a)",
            }}
          />
          <circle
            cx={knobPos.x - 2}
            cy={knobPos.y - 2}
            r={14}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
          <circle
            cx={knobPos.x}
            cy={knobPos.y}
            r={6}
            fill={color}
          />

          {/* Center label */}
          <text
            x={CX}
            y={CY + 30}
            fill="rgba(255,255,255,0.5)"
            fontSize={11}
            fontFamily="'MS Sans Serif', Tahoma, sans-serif"
            textAnchor="middle"
          >
            DRAG TO RATE
          </text>
        </svg>
      </div>

      {/* Submit button */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 24px 36px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          className="win98-btn primary"
          onClick={() => onSubmit(rating)}
          disabled={isSubmitting}
          style={{
            width: "100%",
            maxWidth: 300,
            height: 44,
            fontSize: 16,
            fontFamily: "'VT323', monospace",
            letterSpacing: 2,
            background: isSubmitting ? "#888" : "#C0C0C0",
          }}
        >
          {isSubmitting ? (
            <span className="win98-progress-bar" style={{ display: "inline-block", width: "100%", height: 20 }} />
          ) : (
            `SUBMIT — DAY RATED ${rating}/10`
          )}
        </button>
      </div>
    </div>
  );
};

export default RatingState;
