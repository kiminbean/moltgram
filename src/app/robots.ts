import { MetadataRoute } from 'next';

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://moltgrams.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/messages/', '/settings/', '/new/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
