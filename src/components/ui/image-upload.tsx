import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, Monitor, Smartphone } from "lucide-react";
import { Button } from "./button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageCropper } from "./image-cropper";

interface ImageUploadProps {
  value?: string | null;
  mobileValue?: string | null;
  onChange: (url: string | null) => void;
  onMobileChange?: (url: string | null) => void;
  bucket: string;
  folder: string;
  className?: string;
  aspectRatio?: "square" | "banner" | "auto";
  placeholder?: string;
  maxWidth?: number;
  quality?: number;
  showMobileOption?: boolean;
}

type CropType = "logo" | "banner" | "product";

function getCropType(aspectRatio: string): CropType {
  if (aspectRatio === "banner") return "banner";
  if (aspectRatio === "square") return "product";
  return "product";
}

export function ImageUpload({
  value,
  mobileValue,
  onChange,
  onMobileChange,
  bucket,
  folder,
  className,
  aspectRatio = "square",
  placeholder = "Clique para adicionar imagem",
  maxWidth = 1200,
  quality = 0.8,
  showMobileOption = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Create object URL for cropper
    const objectUrl = URL.createObjectURL(file);
    setTempImageSrc(objectUrl);
    setCropperOpen(true);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const handleCropComplete = useCallback(async (croppedBlob: Blob, device: "desktop" | "mobile") => {
    setUploading(true);
    
    try {
      const timestamp = Date.now();
      const suffix = device === "mobile" ? "_mobile" : "";
      // Add cache-busting query param to force refresh
      const fileName = `${folder}/${timestamp}${suffix}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, croppedBlob, {
          contentType: "image/jpeg",
          cacheControl: "0", // No cache
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Add cache-busting timestamp to URL
      const publicUrlWithCacheBust = `${urlData.publicUrl}?t=${timestamp}`;

      if (device === "mobile" && onMobileChange) {
        onMobileChange(publicUrlWithCacheBust);
      } else {
        onChange(publicUrlWithCacheBust);
      }

      toast.success(`Imagem ${device === "mobile" ? "mobile" : "desktop"} salva!`);
      
      // Always close cropper after successful upload
      setCropperOpen(false);
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc);
        setTempImageSrc(null);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }, [bucket, folder, onChange, onMobileChange, tempImageSrc]);

  const handleRemove = useCallback(() => {
    onChange(null);
    if (onMobileChange) {
      onMobileChange(null);
    }
  }, [onChange, onMobileChange]);

  const handleCloseCropper = useCallback(() => {
    setCropperOpen(false);
    if (tempImageSrc) {
      URL.revokeObjectURL(tempImageSrc);
      setTempImageSrc(null);
    }
  }, [tempImageSrc]);

  const aspectClass = {
    square: "aspect-square",
    banner: "aspect-[3/1]",
    auto: "min-h-[120px]",
  }[aspectRatio];

  const cropType = getCropType(aspectRatio);

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Desktop Image */}
        <div className="space-y-1">
          {showMobileOption && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Monitor className="w-3 h-3" />
              Desktop
            </div>
          )}
          
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {value ? (
            <div className={cn(
              "relative rounded-xl overflow-hidden border border-border bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#ffffff_0%_50%)_50%/16px_16px]",
              aspectClass
            )}>
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

        {/* Mobile Image (optional) */}
        {showMobileOption && onMobileChange && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Smartphone className="w-3 h-3" />
              Mobile
              <span className="text-[10px]">(opcional)</span>
            </div>
            
            {mobileValue ? (
              <div className={cn(
                "relative rounded-xl overflow-hidden border border-border bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#ffffff_0%_50%)_50%/16px_16px]",
                aspectRatio === "banner" ? "aspect-video" : "aspect-square"
              )}>
                <img
                  src={mobileValue}
                  alt="Mobile version"
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
                    onClick={() => onMobileChange(null)}
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
                  aspectRatio === "banner" ? "aspect-video" : "aspect-square"
                )}
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Smartphone className="w-6 h-6" />
                    <span className="text-xs">Versão mobile</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      {tempImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onClose={handleCloseCropper}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
          cropType={cropType}
          loading={uploading}
        />
      )}
    </>
  );
}
