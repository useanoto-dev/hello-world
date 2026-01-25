import { useState, useRef, useCallback, useMemo } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog";
import { Button } from "./button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Monitor, Smartphone, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined aspect ratios for different use cases
const ASPECT_RATIOS = {
  // Desktop ratios
  "logo-desktop": { ratio: 1, width: 400, height: 400, label: "Logo" },
  "banner-desktop": { ratio: 3, width: 1200, height: 400, label: "Banner" },
  "product-desktop": { ratio: 1, width: 800, height: 800, label: "Produto" },
  // Mobile ratios (optimized for mobile viewing)
  "logo-mobile": { ratio: 1, width: 200, height: 200, label: "Logo" },
  "banner-mobile": { ratio: 16/9, width: 640, height: 360, label: "Banner" },
  "product-mobile": { ratio: 1, width: 400, height: 400, label: "Produto" },
} as const;

type CropType = "logo" | "banner" | "product";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob, device: "desktop" | "mobile") => void;
  cropType?: CropType;
  loading?: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImage(
  image: HTMLImageElement,
  crop: PixelCrop,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to target dimensions
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Calculate scale factors
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Draw the cropped image onto the canvas
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

export function ImageCropper({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  cropType = "product",
  loading = false,
}: ImageCropperProps) {
  const [activeDevice, setActiveDevice] = useState<"desktop" | "mobile">("desktop");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const currentConfig = useMemo(() => {
    const key = `${cropType}-${activeDevice}` as keyof typeof ASPECT_RATIOS;
    return ASPECT_RATIOS[key];
  }, [cropType, activeDevice]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, currentConfig.ratio));
    },
    [currentConfig.ratio]
  );

  // Reset crop when device changes
  const handleDeviceChange = useCallback((device: string) => {
    setActiveDevice(device as "desktop" | "mobile");
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const key = `${cropType}-${device}` as keyof typeof ASPECT_RATIOS;
      const config = ASPECT_RATIOS[key];
      setCrop(centerAspectCrop(width, height, config.ratio));
    }
  }, [cropType]);

  const handleConfirm = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedBlob = await getCroppedImage(
        imgRef.current,
        completedCrop,
        currentConfig.width,
        currentConfig.height
      );
      onCropComplete(croppedBlob, activeDevice);
    } catch (error) {
      console.error("Crop error:", error);
    }
  }, [completedCrop, currentConfig, activeDevice, onCropComplete]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✂️ Ajustar Imagem
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeDevice} onValueChange={handleDeviceChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="desktop" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Desktop
              <span className="text-[10px] text-muted-foreground">
                ({currentConfig.width}x{currentConfig.height}px)
              </span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Mobile
              <span className="text-[10px] text-muted-foreground">
                ({ASPECT_RATIOS[`${cropType}-mobile`].width}x{ASPECT_RATIOS[`${cropType}-mobile`].height}px)
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-auto bg-muted/30 rounded-lg p-4 flex items-center justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={currentConfig.ratio}
              className="max-h-[50vh]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[50vh] max-w-full object-contain"
                style={{ display: "block" }}
              />
            </ReactCrop>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {activeDevice === "desktop" ? (
                  <Monitor className="w-4 h-4 text-primary" />
                ) : (
                  <Smartphone className="w-4 h-4 text-primary" />
                )}
                <span className="font-medium">{currentConfig.label}</span>
              </div>
              <div className="text-muted-foreground">
                Dimensão: <span className="font-mono">{currentConfig.width} × {currentConfig.height}px</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeDevice === "desktop" 
                ? "Essa imagem será exibida em computadores e tablets."
                : "Essa imagem será otimizada para visualização em celulares."}
            </p>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !completedCrop}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmar ({activeDevice === "desktop" ? "Desktop" : "Mobile"})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
