import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0.95,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.08,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0.95,
    transition: {
      duration: 0.05,
      ease: "easeOut",
    },
  },
};

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}
