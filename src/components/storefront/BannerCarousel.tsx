import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import Autoplay from "embla-carousel-autoplay";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
}

interface BannerCarouselProps {
  storeId: string;
}

export default function BannerCarousel({ storeId }: BannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBanners() {
      const { data } = await supabase
        .from("banners")
        .select("id, title, image_url, link_url")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("display_order");

      if (data) {
        setBanners(data);
      }
      setLoading(false);
    }

    loadBanners();
  }, [storeId]);

  if (loading) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
        <Skeleton className="h-32 sm:h-40 md:h-48 lg:h-56 w-full rounded-xl lg:rounded-2xl" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const handleBannerClick = (linkUrl: string | null) => {
    if (linkUrl) {
      window.open(linkUrl, "_blank");
    }
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
            stopOnInteraction: false,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-2 lg:-ml-4">
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="pl-2 lg:pl-4 basis-full">
              <div
                className={`relative overflow-hidden rounded-xl lg:rounded-2xl ${banner.link_url ? "cursor-pointer" : ""}`}
                onClick={() => handleBannerClick(banner.link_url)}
              >
                <img
                  src={banner.image_url}
                  alt={banner.title || "Banner promocional"}
                  className="w-full h-32 sm:h-40 md:h-48 lg:h-56 object-cover"
                />
                {banner.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4 lg:p-5">
                    <p className="text-white text-sm sm:text-base lg:text-lg font-medium">{banner.title}</p>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
