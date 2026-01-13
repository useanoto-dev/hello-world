import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TopProgressBarProps {
  isLoading: boolean;
}

export default function TopProgressBar({ isLoading }: TopProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setProgress(70);
      const timer = setTimeout(() => setProgress(90), 30);
      return () => clearTimeout(timer);
    } else {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 80);
      return () => clearTimeout(hideTimer);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent pointer-events-none">
      <motion.div
        className="h-full bg-primary"
        initial={{ width: "0%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.08, ease: "linear" }}
      />
    </div>
  );
}
