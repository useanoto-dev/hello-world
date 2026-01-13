import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-green-500 group-[.toaster]:!text-white group-[.toaster]:!border-green-600",
          error: "group-[.toaster]:!bg-orange-500 group-[.toaster]:!text-white group-[.toaster]:!border-orange-600",
          warning: "group-[.toaster]:!bg-orange-500 group-[.toaster]:!text-white group-[.toaster]:!border-orange-600",
          info: "group-[.toaster]:!bg-blue-500 group-[.toaster]:!text-white group-[.toaster]:!border-blue-600",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
