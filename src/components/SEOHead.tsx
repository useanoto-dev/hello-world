// SEO Head Component - Manages meta tags for better SEO
import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  structuredData?: Record<string, any>;
}

const DEFAULT_TITLE = "Anotô? | Pediu, chegou!";
const DEFAULT_DESCRIPTION = "Cardápio digital inteligente para seu estabelecimento. Gerencie pedidos, produtos e clientes de forma fácil e rápida.";
const DEFAULT_IMAGE = "https://felipedublin.com/wp-content/uploads/2026/01/logoanoto-scaled-e1767383946555.webp";

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noindex = false,
  structuredData,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | Anotô?` : DEFAULT_TITLE;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const updateMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute("content", content);
    };

    // Basic meta tags
    updateMeta("description", description);
    if (keywords) updateMeta("keywords", keywords);

    // Robots
    if (noindex) {
      updateMeta("robots", "noindex, nofollow");
    } else {
      updateMeta("robots", "index, follow");
    }

    // Open Graph
    updateMeta("og:title", fullTitle, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", type, true);
    updateMeta("og:image", image, true);
    if (url) updateMeta("og:url", url, true);

    // Twitter Card
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", image);

    // Structured Data (JSON-LD)
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]');
      
      if (!script) {
        script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        document.head.appendChild(script);
      }
      
      script.textContent = JSON.stringify(structuredData);
    }

    // Canonical URL
    if (url) {
      let link = document.querySelector('link[rel="canonical"]');
      
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      
      link.setAttribute("href", url);
    }
  }, [fullTitle, description, keywords, image, url, type, noindex, structuredData]);

  return null;
}

// Helper to generate structured data for restaurants
export function generateRestaurantSchema(store: {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  image?: string;
  priceRange?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: store.name,
    description: store.description,
    address: store.address ? {
      "@type": "PostalAddress",
      streetAddress: store.address,
    } : undefined,
    telephone: store.phone,
    image: store.image,
    priceRange: store.priceRange || "$$",
    servesCuisine: "Brazilian",
    acceptsReservations: "No",
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: [],
    },
  };
}

// Helper to generate structured data for products
export function generateProductSchema(product: {
  name: string;
  description?: string;
  price: number;
  image?: string;
  availability?: "InStock" | "OutOfStock";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "BRL",
      availability: product.availability === "OutOfStock" 
        ? "https://schema.org/OutOfStock" 
        : "https://schema.org/InStock",
    },
  };
}

// Helper to generate breadcrumb schema
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export default SEOHead;
