// note: the jay display font only covers basic ascii (111 glyphs).
// avoid em/en dashes (— –) and middle dots (·) in any copy rendered
// on-page - they fall back to a mismatched font. use - and / instead.
// (html <title> / rss <title> are fine - the browser renders those.)
export const site = {
  name: "Jay Patel",
  shortName: "Jay",
  title: "Jay Patel",
  siteName: "jaypa.tel",
  url: "https://jaypa.tel",
  locale: "en",
  language: "en",
  description:
    "Software developer and team lead in Madison. I work at Epic. I've worked in several Cogito (analytics) spaces there, but now I work on the Agent Factory team. I'm also really interested in AI and would love to talk shop.",
  bio: "I'm Jay. I lead a software team at Epic Systems in Madison, Wisconsin. I spend way too much time tinkering with AI when I should be making the best platform for healthcare intelligence. Always happy to chat if you want to talk about anything - ",
  jobTitle: "Software Developer and Team Lead - Agent Factory",
  location: {
    city: "Madison",
    region: "Wisconsin",
    regionCode: "WI",
    country: "US",
    countryName: "United States",
  },
  employer: {
    name: "Epic Systems",
    url: "https://www.epic.com/",
    logo: "/epic-logo.png",
  },
  email: "jaypatel122700@gmail.com",
  availability: "always happy to chat about anything :) ",
  author: "Jay Patel",
  copyright: "All rights reserved",
  themeColor: "#14110e",
  shareImage: {
    url: "/og.png",
    twitterUrl: "/twitter.png",
    alt: "jay patel - jaypa.tel",
  },
  socials: [
    { id: "github", label: "github", url: "https://github.com/jaypatel1227" },
    {
      id: "linkedin",
      label: "linkedin",
      url: "https://www.linkedin.com/in/jay-patel-125952149/",
    },
    { id: "x", label: "x", url: "https://x.com/jaypa_dot_tel" },
  ],
} as const;

export const xSocial = site.socials.find((social) => social.id === "x")!;

export type SeoImage = {
  url: string;
  alt: string;
  twitterUrl?: string;
};

export type PostFrontmatter = {
  title: string;
  description: string;
  pubDate: Date | string;
  updatedDate?: Date | string;
  author?: string;
  tags?: string[];
  image?: {
    url: string;
    alt: string;
  };
};

export function absUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return new URL(path, site.url).href;
}

export function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date
    .toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .toLowerCase();
}

export function toIsoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function personJsonLd() {
  return {
    "@type": "Person",
    "@id": `${site.url}/#person`,
    name: site.name,
    url: site.url,
    jobTitle: site.jobTitle,
    email: `mailto:${site.email}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.location.city,
      addressRegion: site.location.regionCode,
      addressCountry: site.location.country,
    },
    worksFor: {
      "@type": "Organization",
      name: site.employer.name,
      url: site.employer.url,
      logo: absUrl(site.employer.logo),
    },
    sameAs: site.socials.map((social) => social.url),
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.siteName,
    url: site.url,
    inLanguage: site.language,
    author: { "@id": `${site.url}/#person` },
    publisher: { "@id": `${site.url}/#person` },
  };
}

export function blogPostingJsonLd(input: {
  title: string;
  description: string;
  canonical: string;
  pubDate: Date | string;
  updatedDate?: Date | string;
  tags?: readonly string[];
  imageUrl?: string;
}) {
  return {
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    datePublished: toIsoDate(input.pubDate),
    dateModified: toIsoDate(input.updatedDate ?? input.pubDate),
    author: { "@id": `${site.url}/#person` },
    publisher: { "@id": `${site.url}/#person` },
    mainEntityOfPage: input.canonical,
    inLanguage: site.language,
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
    ...(input.tags && input.tags.length > 0 ? { keywords: input.tags.join(", ") } : {}),
  };
}

export function jsonLdGraph(extra: Record<string, unknown>[] = []) {
  return {
    "@context": "https://schema.org",
    "@graph": [personJsonLd(), websiteJsonLd(), ...extra],
  };
}
