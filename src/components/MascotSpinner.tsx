import { motion } from "framer-motion";
import anotoMascot from "@/assets/anoto-mascot.png";

interface MascotSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function MascotSpinner({ size = "sm", className = "" }: MascotSpinnerProps) {
  return (
    <motion.img
      src={anotoMascot}
      alt="Carregando..."
      className={`${sizeMap[size]} object-contain ${className}`}
      animate={{
        rotate: [0, -10, 10, -10, 0],
        scale: [1, 1.1, 1, 1.1, 1],
      }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
