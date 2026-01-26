import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import anotoMascot from "@/assets/anoto-mascot.png";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "compact" | "mascot";
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const iconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 15,
    },
  },
};

const mascotVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
    },
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default",
  className = "",
}: EmptyStateProps) {
  if (variant === "compact") {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`text-center py-8 ${className}`}
      >
        {Icon && (
          <motion.div variants={iconVariants} className="mb-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-muted-foreground/60" />
            </div>
          </motion.div>
        )}
        <motion.p
          variants={itemVariants}
          className="text-sm text-muted-foreground font-medium"
        >
          {title}
        </motion.p>
        {description && (
          <motion.p
            variants={itemVariants}
            className="text-xs text-muted-foreground/70 mt-1"
          >
            {description}
          </motion.p>
        )}
        {actionLabel && onAction && (
          <motion.div variants={itemVariants} className="mt-3">
            <Button size="sm" variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  if (variant === "mascot") {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`text-center py-12 px-4 ${className}`}
      >
        <motion.div
          variants={mascotVariants}
          className="relative mx-auto mb-6 w-24 h-24"
        >
          <motion.div
            className="absolute inset-0 bg-primary/10 rounded-full blur-xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.img
            src={anotoMascot}
            alt=""
            className="w-24 h-24 object-contain relative z-10 drop-shadow-md"
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        <motion.h3
          variants={itemVariants}
          className="text-lg font-semibold text-foreground mb-2"
        >
          {title}
        </motion.h3>
        {description && (
          <motion.p
            variants={itemVariants}
            className="text-sm text-muted-foreground max-w-sm mx-auto"
          >
            {description}
          </motion.p>
        )}
        {actionLabel && onAction && (
          <motion.div variants={itemVariants} className="mt-6">
            <Button onClick={onAction} className="gap-2">
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`text-center py-12 px-4 bg-muted/20 rounded-xl border border-dashed border-border ${className}`}
    >
      {Icon && (
        <motion.div variants={iconVariants} className="mb-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center shadow-sm">
            <Icon className="w-7 h-7 text-muted-foreground/70" />
          </div>
        </motion.div>
      )}
      <motion.h3
        variants={itemVariants}
        className="text-base font-semibold text-foreground mb-1"
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          variants={itemVariants}
          className="text-sm text-muted-foreground max-w-md mx-auto"
        >
          {description}
        </motion.p>
      )}
      {actionLabel && onAction && (
        <motion.div variants={itemVariants} className="mt-5">
          <Button onClick={onAction} variant="default" className="gap-2">
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
