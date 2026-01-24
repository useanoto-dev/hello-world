// Landing page animation components
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";

const COLORS = {
  foreground: "#1D1D1F",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  muted: "#86868B",
};

// Card with individual scroll animation
export function AnimatedCard({ 
  children, 
  delay = 0, 
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  className?: string 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Typewriter effect hook
export function useTypewriter(
  text: string, 
  typeSpeed: number = 80, 
  deleteSpeed: number = 40, 
  pauseTime: number = 4000
) {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
    } else if (!isDeleting) {
      if (displayText.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length + 1));
        }, typeSpeed);
      } else {
        setIsPaused(true);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length - 1));
        }, deleteSpeed);
      } else {
        setIsDeleting(false);
      }
    }
    
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, isPaused, text, typeSpeed, deleteSpeed, pauseTime]);
  
  return { displayText, isDeleting };
}

// Section Title with animation
export function SectionTitle({ 
  badge, 
  title, 
  subtitle 
}: { 
  badge?: string; 
  title: string; 
  subtitle?: string 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { displayText } = useTypewriter(title, 80);
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-12"
    >
      {badge && (
        <span 
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wide"
          style={{ backgroundColor: `${COLORS.primary}20`, color: COLORS.primaryDark }}
        >
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: COLORS.foreground }}>
        {displayText}
        <motion.span 
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          className="ml-0.5 font-light"
          style={{ color: COLORS.primary }}
        >|</motion.span>
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: COLORS.muted }}>{subtitle}</p>
      )}
    </motion.div>
  );
}
