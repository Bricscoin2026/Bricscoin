import { useEffect, useState, useMemo } from "react";

const CHARS = "0123456789abcdef";

function generateHexChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function HashStreamBackground() {
  const [columns, setColumns] = useState([]);

  const columnCount = useMemo(() => {
    if (typeof window !== "undefined") {
      return Math.floor(window.innerWidth / 40);
    }
    return 30;
  }, []);

  useEffect(() => {
    const cols = [];
    for (let i = 0; i < columnCount; i++) {
      const chars = [];
      const charCount = Math.floor(Math.random() * 20) + 10;
      for (let j = 0; j < charCount; j++) {
        chars.push(generateHexChar());
      }
      cols.push({
        id: i,
        chars,
        left: (i / columnCount) * 100,
        delay: Math.random() * 8,
        duration: Math.random() * 4 + 6,
      });
    }
    setColumns(cols);
  }, [columnCount]);

  return (
    <div className="hash-stream-container" data-testid="hash-background">
      {columns.map((col) => (
        <div
          key={col.id}
          className="hash-column"
          style={{
            left: `${col.left}%`,
            animationDelay: `${col.delay}s`,
            animationDuration: `${col.duration}s`,
          }}
        >
          {col.chars.map((char, idx) => (
            <span
              key={idx}
              className="hash-char"
              style={{
                animationDelay: `${col.delay + idx * 0.1}s`,
                animationDuration: `${col.duration}s`,
              }}
            >
              {char}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
