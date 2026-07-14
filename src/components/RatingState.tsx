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
    "#A8523F", "#AD5C42", "#B26647", "#B4744C", "#B08255",
    "#A38F5E", "#909A66", "#7CA26C", "#6B9670", "#5E8A6A",
  ];
  return colors[r - 1] ?? "#5E8A6A";
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
        background: "hsl(var(--ink))",
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
          filter: "blur(16px) brightness(0.35)",
          zIndex: 0,
        }}
      />

      {/* Thumbnail card (small, top) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "24px 20px 0",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className="journal-card"
          style={{ width: 150, overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)" }}
        >
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
          marginTop: 16,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: color,
        }}
      >
        {getRatingLabel(rating)}
        <div className="font-journal-display" style={{ fontSize: 48, lineHeight: 1.1, fontWeight: 600, color: "#fff", letterSpacing: 0 }}>{rating}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "none" }}>out of 10</div>
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
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={14}
            strokeLinecap="round"
          />
          {/* Filled arc up to rating */}
          <path
            d={describeFilledArc(CX, CY, R, START_ANGLE, filledEnd)}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
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
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={v === rating ? 2.5 : 1}
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill={v === rating ? color : "rgba(255,255,255,0.45)"}
                  fontSize={v === rating ? 13 : 10}
                  fontFamily="'Lora', Georgia, serif"
                  fontWeight={v === rating ? 600 : 400}
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
            r={11}
            fill="#fff"
            style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
          />
          <circle
            cx={knobPos.x}
            cy={knobPos.y}
            r={5}
            fill={color}
          />

          {/* Center label */}
          <text
            x={CX}
            y={CY + 30}
            fill="rgba(255,255,255,0.4)"
            fontSize={12}
            fontFamily="'Inter', sans-serif"
            letterSpacing={0.5}
            textAnchor="middle"
          >
            drag to rate
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
          className="journal-btn journal-btn-primary"
          onClick={() => onSubmit(rating)}
          disabled={isSubmitting}
          style={{
            width: "100%",
            maxWidth: 300,
            height: 48,
            fontSize: 15,
          }}
        >
          {isSubmitting ? (
            <span className="journal-progress-bar" style={{ display: "inline-block", width: "100%", height: 4 }} />
          ) : (
            `Save today's entry — ${rating}/10`
          )}
        </button>
      </div>
    </div>
  );
};

export default RatingState;
