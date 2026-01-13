import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "./button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  folder: string;
  className?: string;
  aspectRatio?: "square" | "banner" | "auto";
  placeholder?: string;
  maxWidth?: number;
  quality?: number;
}

// Compress image using canvas - preserves transparency for PNGs
async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<{ blob: Blob; isPng: boolean }> {
  const isPng = file.type === "image/png";
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // For PNGs, ensure transparent background
      if (isPng && ctx) {
        ctx.clearRect(0, 0, width, height);
      }

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      // Use PNG format for transparent images, JPEG for others
      const format = isPng ? "image/png" : "image/jpeg";
      const compressionQuality = isPng ? undefined : quality;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, isPng });
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        format,
        compressionQuality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUpload({
  value,
  onChange,
  bucket,
  folder,
  className,
  aspectRatio = "square",
  placeholder = "Clique para adicionar imagem",
  maxWidth = 1200,
  quality = 0.8,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB");
      return;
    }

    setUploading(true);
    try {
      // Compress image (preserves format for PNGs)
      const { blob: compressedBlob, isPng } = await compressImage(file, maxWidth, quality);
      const extension = isPng ? "png" : "jpg";
      const contentType = isPng ? "image/png" : "image/jpeg";
      const fileName = `${folder}/${Date.now()}.${extension}`;

      console.log(
        `Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedBlob.size / 1024).toFixed(1)}KB (${isPng ? 'PNG' : 'JPEG'})`
      );

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedBlob, {
          contentType,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  const aspectClass = {
    square: "aspect-square",
    banner: "aspect-[3/1]",
    auto: "min-h-[120px]",
  }[aspectRatio];

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {value ? (
        <div className={cn("relative rounded-xl overflow-hidden border border-border bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#ffffff_0%_50%)_50%/16px_16px]", aspectClass)}>
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Trocar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer",
            aspectClass
          )}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8" />
              <span className="text-sm">{placeholder}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
