import { useEffect, useRef } from "react";

export default function HashStreamBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Matrix characters (hex + some special chars)
    const chars = "0123456789ABCDEFabcdef₿ΣΔΩ";
    const charArray = chars.split("");
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    // Array of drops - one per column
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    // Draw function
    const draw = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set font
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Calculate x position
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Gradient effect - brighter at the head
        const gradient = ctx.createLinearGradient(x, y - fontSize * 10, x, y);
        gradient.addColorStop(0, "rgba(0, 255, 0, 0)");
        gradient.addColorStop(0.8, "rgba(0, 180, 0, 0.3)");
        gradient.addColorStop(1, "rgba(0, 255, 0, 0.8)");
        
        // Leading character is brighter (gold color for BricsCoin)
        if (Math.random() > 0.98) {
          ctx.fillStyle = "#FFD700"; // Gold
        } else {
          ctx.fillStyle = `rgba(0, ${150 + Math.random() * 105}, 0, ${0.3 + Math.random() * 0.5})`;
        }
        
        ctx.fillText(char, x, y);

        // Reset drop when it goes below screen
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        // Move drop down
        drops[i]++;
      }
    };

    // Animation loop
    const interval = setInterval(draw, 50);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
      data-testid="matrix-background"
    />
  );
}
