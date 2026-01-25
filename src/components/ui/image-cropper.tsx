import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog";
import { Button } from "./button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Monitor, Smartphone, Loader2, Check, Wand2 } from "lucide-react";
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
  
  // Separate crop states for desktop and mobile
  const [desktopCrop, setDesktopCrop] = useState<Crop>();
  const [mobileCrop, setMobileCrop] = useState<Crop>();
  const [desktopCompletedCrop, setDesktopCompletedCrop] = useState<PixelCrop>();
  const [mobileCompletedCrop, setMobileCompletedCrop] = useState<PixelCrop>();
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get current crop based on active device
  const currentCrop = activeDevice === "desktop" ? desktopCrop : mobileCrop;
  const setCurrentCrop = activeDevice === "desktop" ? setDesktopCrop : setMobileCrop;
  const currentCompletedCrop = activeDevice === "desktop" ? desktopCompletedCrop : mobileCompletedCrop;
  const setCurrentCompletedCrop = activeDevice === "desktop" ? setDesktopCompletedCrop : setMobileCompletedCrop;

  const currentConfig = useMemo(() => {
    const key = `${cropType}-${activeDevice}` as keyof typeof ASPECT_RATIOS;
    return ASPECT_RATIOS[key];
  }, [cropType, activeDevice]);

  const desktopConfig = useMemo(() => {
    const key = `${cropType}-desktop` as keyof typeof ASPECT_RATIOS;
    return ASPECT_RATIOS[key];
  }, [cropType]);

  const mobileConfig = useMemo(() => {
    const key = `${cropType}-mobile` as keyof typeof ASPECT_RATIOS;
    return ASPECT_RATIOS[key];
  }, [cropType]);

  // Initialize crops when image loads
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setImageLoaded(true);
      
      // Initialize both crops if not set
      if (!desktopCrop) {
        setDesktopCrop(centerAspectCrop(width, height, desktopConfig.ratio));
      }
      if (!mobileCrop) {
        setMobileCrop(centerAspectCrop(width, height, mobileConfig.ratio));
      }
    },
    [desktopCrop, mobileCrop, desktopConfig.ratio, mobileConfig.ratio]
  );

  // Auto-adjust function
  const handleAutoAdjust = useCallback(() => {
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    const newCrop = centerAspectCrop(width, height, currentConfig.ratio);
    setCurrentCrop(newCrop);
  }, [currentConfig.ratio, setCurrentCrop]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setDesktopCrop(undefined);
      setMobileCrop(undefined);
      setDesktopCompletedCrop(undefined);
      setMobileCompletedCrop(undefined);
      setImageLoaded(false);
      setActiveDevice("desktop");
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (!imgRef.current || !currentCompletedCrop) return;

    try {
      const croppedBlob = await getCroppedImage(
        imgRef.current,
        currentCompletedCrop,
        currentConfig.width,
        currentConfig.height
      );
      onCropComplete(croppedBlob, activeDevice);
    } catch (error) {
      console.error("Crop error:", error);
    }
  }, [currentCompletedCrop, currentConfig, activeDevice, onCropComplete]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✂️ Ajustar Imagem
          </DialogTitle>
        </DialogHeader>

        <Tabs 
          value={activeDevice} 
          onValueChange={(v) => setActiveDevice(v as "desktop" | "mobile")} 
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="desktop" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Desktop
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                ({desktopConfig.width}x{desktopConfig.height})
              </span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Mobile
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                ({mobileConfig.width}x{mobileConfig.height})
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-auto bg-muted/30 rounded-lg p-4 flex items-center justify-center relative">
            <ReactCrop
              crop={currentCrop}
              onChange={(_, percentCrop) => setCurrentCrop(percentCrop)}
              onComplete={(c) => setCurrentCompletedCrop(c)}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {activeDevice === "desktop" ? (
                  <Monitor className="w-4 h-4 text-primary" />
                ) : (
                  <Smartphone className="w-4 h-4 text-primary" />
                )}
                <span className="font-medium">{currentConfig.label}</span>
                <span className="text-muted-foreground text-xs">
                  {currentConfig.width} × {currentConfig.height}px
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoAdjust}
                className="gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Ajustar automático
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {activeDevice === "desktop" 
                ? "Essa imagem será exibida em computadores e tablets."
                : "Essa imagem será otimizada para visualização em celulares."}
            </p>
          </div>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !currentCompletedCrop}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Salvar {activeDevice === "desktop" ? "Desktop" : "Mobile"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
