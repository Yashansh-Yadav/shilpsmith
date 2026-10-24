// Hero headline that "prints" itself: every character is laid down bottom-up
// in layer steps with an emerald extruder sweep (CSS in globals.css under
// "Homepage"). Pure CSS + server-renderable — the real text is in the HTML via
// aria-label, the per-character spans are presentation only.

interface Line {
  text: string;
  className?: string;
}

const CHAR_STAGGER = 0.035; // seconds between characters
const START = 0.15;

export default function PrintHeadline({
  lines,
  className = "",
  style,
}: {
  lines: Line[];
  className?: string;
  style?: React.CSSProperties;
}) {
  let i = 0;
  return (
    <h1
      className={className}
      style={style}
      aria-label={lines.map((l) => l.text).join(" ")}
    >
      {lines.map((line) => (
        <span key={line.text} className={`block ${line.className ?? ""}`} aria-hidden="true">
          {line.text.split(" ").map((word, w) => (
            <span key={w}>
              {w > 0 && " "}
              <span className="pword">
                {Array.from(word).map((ch, c) => {
                  const d = `${(START + i++ * CHAR_STAGGER).toFixed(3)}s`;
                  return (
                    <span
                      key={c}
                      className="pchar"
                      style={{ "--d": d } as React.CSSProperties}
                    >
                      <span className="pm">{ch}</span>
                      <span className="ps" style={{ clipPath: "inset(0 0 62% 0)" }}>
                        {ch}
                      </span>
                      <span className="ps pb" style={{ clipPath: "inset(62% 0 0 0)" }}>
                        {ch}
                      </span>
                    </span>
                  );
                })}
              </span>
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
