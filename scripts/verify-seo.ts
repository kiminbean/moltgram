#!/usr/bin/env node

/**
 * MoltGram SEO & Health Verification Script
 * 
 * Usage:
 *   npx ts-node scripts/verify-seo.ts [url]
 *   
 * Default URL: https://moltgrams.com
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

const BASE_URL = process.argv[2] || 'https://moltgrams.com';
const REQUIRED_PATHS = [
  '/',
  '/guide', 
  '/feedback',
  '/status',
  '/faq',
  '/privacy',
  '/terms',
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.json'
];

const REQUIRED_META_TAGS = [
  '<title>',
  '<meta name="description"',
  '<meta property="og:title"',
  '<meta property="og:description"',
  '<meta property="og:image"',
  '<meta name="twitter:card"',
];

console.log(`🔍 Starting SEO Verification for: ${BASE_URL}\n`);

async function fetchUrl(urlStr: string): Promise<{ statusCode: number, body: string, headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode || 0,
        body: data,
        headers: res.headers
      }));
    });
    
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function verifyPath(path: string) {
  const url = `${BASE_URL}${path}`;
  try {
    const start = Date.now();
    const { statusCode, body, headers } = await fetchUrl(url);
    const duration = Date.now() - start;
    
    const statusIcon = statusCode === 200 ? '✅' : '❌';
    console.log(`${statusIcon} ${path.padEnd(20)} [${statusCode}] (${duration}ms)`);
    
    if (statusCode !== 200) {
      console.error(`   Error: Expected 200, got ${statusCode}`);
      return false;
    }

    // Check specific content types
    if (path === '/sitemap.xml') {
      if (!body.includes('<?xml') && !body.includes('<urlset')) {
        console.error('   ❌ Invalid sitemap XML format');
        return false;
      }
      const urlCount = (body.match(/<url>/g) || []).length;
      console.log(`   Found ${urlCount} URLs in sitemap`);
    } else if (path === '/robots.txt') {
      if (!body.includes('User-agent:') && !body.includes('User-Agent:')) {
         console.error('   ❌ Invalid robots.txt format');
         console.log('   Received:', body.substring(0, 100).replace(/\n/g, '\\n'));
         return false;
      }
    } else if (path === '/manifest.json') {
      try {
        JSON.parse(body);
      } catch {
        console.error('   ❌ Invalid JSON in manifest');
        return false;
      }
    } else {
      // HTML Page checks
      let missingTags = [];
      for (const tag of REQUIRED_META_TAGS) {
        // Simple string check (robust enough for static/SSR output)
        if (!body.includes(tag)) {
          // Special case: title might be in different format
          if (tag === '<title>' && /<title>.*<\/title>/.test(body)) continue;
          missingTags.push(tag);
        }
      }
      
      if (missingTags.length > 0) {
        console.warn(`   ⚠️ Missing meta tags: ${missingTags.join(', ')}`);
        // Don't fail the build, but warn
      } else {
        console.log(`   ✅ All core meta tags present`);
      }
    }
    
    return true;

  } catch (error) {
    console.error(`❌ ${path.padEnd(20)} Connection Failed: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  console.log('--- Checking Core Paths ---');
  let success = true;
  
  for (const path of REQUIRED_PATHS) {
    if (!await verifyPath(path)) {
      success = false;
    }
  }
  
  console.log('\n--- Summary ---');
  if (success) {
    console.log('✅ SEO Verification Passed!');
    process.exit(0);
  } else {
    console.error('❌ SEO Verification Failed!');
    process.exit(1);
  }
}

main();
