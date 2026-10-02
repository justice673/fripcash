"use client";

import { useState } from "react";
import Link from "next/link";
import { useCategories } from "@/hooks/use-categories";

const AREA_MAP: Record<string, string> = {
  Femme: "women",
  Homme: "men",
  Enfant: "kids",
  Maison: "home",
  Électronique: "electronics",
  Sport: "sport",
  Mode: "mode",
  Enseignes: "enseignes",
};

function areaKey(name: string, slug?: string) {
  return (
    AREA_MAP[name] ||
    slug ||
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) ||
    "cat"
  );
}

type Cat = { label: string; href: string; area: string; image: string };

export function CategoriesGrid() {
  const { data: rawCategories = [] } = useCategories();

  // Only categories with a seeded Cloudinary imageUrl from the API.
  const categories: Cat[] = rawCategories
    .filter((cat: { image?: string }) => !!cat.image)
    .slice(0, 6)
    .map((cat: { name: string; slug?: string; image?: string }, i: number) => ({
      label: cat.name,
      href: `/produits?category=${encodeURIComponent(cat.name)}`,
      area: `${areaKey(cat.name, cat.slug)}_${i}`,
      image: cat.image as string,
    }));

  if (categories.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold tracking-tight mb-6">
        Explorer les catégories
      </h2>

      {/* Desktop — mosaic only when we have a full set; otherwise simple grid */}
      {categories.length >= 6 ? (
        <div
          className="hidden sm:grid gap-3"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr",
            gridTemplateRows: "260px 180px 180px",
            gridTemplateAreas: `
              "${categories[0].area} ${categories[1].area} ${categories[5].area}"
              "${categories[0].area} ${categories[2].area} ${categories[3].area}"
              "${categories[4].area} ${categories[2].area} ${categories[3].area}"
            `,
          }}
        >
          {categories.map((cat) => (
            <CategoryCard key={cat.area} cat={cat} />
          ))}
        </div>
      ) : (
        <div
          className="hidden sm:grid gap-3"
          style={{
            gridTemplateColumns:
              categories.length === 1
                ? "1fr"
                : categories.length === 2
                  ? "1fr 1fr"
                  : "repeat(3, 1fr)",
            gridAutoRows: "220px",
          }}
        >
          {categories.map((cat) => (
            <CategoryCard key={cat.area} cat={cat} useArea={false} />
          ))}
        </div>
      )}

      {/* Mobile — only as many rows as needed (no ghost empty rows) */}
      <div
        className="grid sm:hidden gap-3"
        style={mobileGridStyle(categories)}
      >
        {categories.map((cat) => (
          <CategoryCard
            key={cat.area}
            cat={cat}
            useArea={categories.length >= 3}
          />
        ))}
      </div>
    </section>
  );
}

function mobileGridStyle(categories: Cat[]): React.CSSProperties {
  const n = categories.length;
  if (n === 1) {
    return {
      gridTemplateColumns: "1fr",
      gridAutoRows: "200px",
    };
  }
  if (n === 2) {
    return {
      gridTemplateColumns: "1fr 1fr",
      gridAutoRows: "160px",
    };
  }
  if (n === 3) {
    return {
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "180px 140px",
      gridTemplateAreas: `
        "${categories[0].area} ${categories[0].area}"
        "${categories[1].area} ${categories[2].area}"
      `,
    };
  }
  if (n === 4) {
    return {
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "180px 140px 140px",
      gridTemplateAreas: `
        "${categories[0].area} ${categories[0].area}"
        "${categories[1].area} ${categories[2].area}"
        "${categories[3].area} ${categories[3].area}"
      `,
    };
  }
  if (n === 5) {
    return {
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "180px 140px 140px",
      gridTemplateAreas: `
        "${categories[0].area} ${categories[0].area}"
        "${categories[1].area} ${categories[2].area}"
        "${categories[3].area} ${categories[4].area}"
      `,
    };
  }
  // 6+
  return {
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "200px 140px 140px 140px",
    gridTemplateAreas: `
      "${categories[0].area} ${categories[0].area}"
      "${categories[1].area} ${categories[5].area}"
      "${categories[2].area} ${categories[3].area}"
      "${categories[4].area} ${categories[4].area}"
    `,
  };
}

function CategoryCard({
  cat,
  useArea = true,
}: {
  cat: Cat;
  useArea?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <Link
      href={cat.href}
      className="relative min-h-[140px] overflow-hidden rounded-xl group bg-muted"
      style={useArea ? { gridArea: cat.area } : undefined}
    >
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cat.image}
          alt=""
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <span className="absolute bottom-3 left-3 text-white font-semibold text-lg drop-shadow">
        {cat.label}
      </span>
    </Link>
  );
}
