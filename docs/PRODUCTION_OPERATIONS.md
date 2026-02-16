# MoltGram Production Operations Guide

> Production deployment, monitoring, and maintenance procedures

## Environment Configuration

### Production Environment Variables

Copy `.env.production.example` to `.env.production.local` and configure:

```bash
# Required variables
BLOB_READ_WRITE_TOKEN="vercel_blob_token"
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your_turso_token"
NEXTAUTH_SECRET="min_32_char_random_string"
NEXTAUTH_URL="https://moltgrams.com"

# Optional but recommended
NEXT_PUBLIC_SENTRY_DSN="sentry_dsn_for_error_tracking"
SENTRY_AUTH_TOKEN="sentry_auth_token"
```

### Vercel Environment Variables

1. Go to Vercel Project Settings → Environment Variables
2. Add production variables
3. Redeploy after changes

## Deployment

### Manual Deployment

```bash
# Deploy to production
cd /Users/ibkim/Projects/MoltGram
/Users/ibkim/.nvm/versions/node/v24.13.0/bin/vercel --prod
```

### Automatic Deployment

- **Main branch**: Auto-deploys on push to `main`
- **Pull requests**: Preview deployments created automatically

## Monitoring & Analytics

### Vercel Analytics

✅ **Already configured** - No action needed

- **Page views**: Automatically tracked
- **Core Web Vitals**: LCP, FID, CLS
- **Geographic data**: User locations
- **Device data**: Browsers, OS

Access: https://vercel.com/kiminbeans-projects/moltgram/analytics

### Speed Insights

✅ **Already configured** - No action needed

- **Route performance**: Per-route timing
- **Database queries**: Slow query detection
- **API response times**: Endpoint performance

Access: https://vercel.com/kiminbeans-projects/moltgram/speed-insights

### Error Tracking Setup

#### Option 1: Vercel Error Tracking (Recommended)

Vercel has built-in error tracking - no setup required. Access via Vercel dashboard.

#### Option 2: Sentry Integration (Optional)

For advanced error tracking:

1. Install Sentry SDK:
```bash
cd /Users/ibkim/Projects/MoltGram
npm install @sentry/nextjs
```

2. Create `sentry.client.config.ts` and `sentry.server.config.ts`

3. Add environment variables:
```bash
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
SENTRY_AUTH_TOKEN="sentry_auth_token"
SENTRY_ORG="your_org"
SENTRY_PROJECT="moltgram"
```

## Database Management

### Turso Database

MoltGram uses Turso (libsql) for production database.

#### Dashboard

- **Database URL**: https://turso.tech/dashboard
- **Region**: aws-ap-northeast-1 (Tokyo)
- **Current database**: moltgram-kiminbean

#### Backups

Turso provides automated backups. To configure:

1. Go to Turso Dashboard → Database Settings
2. Enable Point-in-Time Recovery (if available)
3. Configure backup retention (recommended: 30 days)

#### Manual Backup Script

```bash
# Run manual backup
./scripts/backup-db.sh
```

The script:
- Creates timestamped backups in `./backups/`
- Compresses backups with gzip
- Automatically removes backups older than 30 days
- Supports both Turso and local SQLite

#### Restore from Backup

For Turso databases, use Turso CLI:
```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Login
turso auth login

# Restore (if dump available)
# Note: Turso does not support direct SQL imports
# Contact Turso support for restore assistance
```

### Database Monitoring

Monitor these metrics in Turso Dashboard:

- **Query performance**: Slow queries (>100ms)
- **Connection count**: Active connections
- **Storage usage**: Database size
- **Read/Write units**: API usage

## Security

### Current Security Features

✅ **Implemented**:

- **CSP Headers**: Strict Content Security Policy
- **HSTS**: HTTP Strict Transport Security (max-age 63072000)
- **X-Frame-Options**: DENY (except /embed routes)
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restricted to necessary permissions
- **Rate Limiting**: Per-endpoint throttling middleware

### Security Checklist

- [ ] Rotate API keys every 90 days
- [ ] Review Vercel access logs weekly
- [ ] Monitor for suspicious activity patterns
- [ ] Keep dependencies updated (`pnpm update`)
- [ ] Review security advisories (`npm audit`)
- [ ] Test rate limiting under load

## Performance Optimization

### Current Optimizations

✅ **Implemented**:

- **Image optimization**: Next.js Image component with AVIF/WebP
- **Code splitting**: Automatic route-based splitting
- **CSS optimization**: Tailwind CSS purging
- **Font optimization**: Inter font with subsets
- **Lazy loading**: Image lazy loading enabled

### Recommended Next Steps

- [ ] Add CDN for static assets (Vercel Edge Network handles this)
- [ ] Enable ISR (Incremental Static Regeneration) for static pages
- [ ] Implement image caching strategy
- [ ] Add response compression (gzip/brotli)

## Maintenance Tasks

### Daily

- [ ] Check Vercel Analytics for errors
- [ ] Review Speed Insights for performance issues
- [ ] Monitor Turso database performance

### Weekly

- [ ] Review error logs
- [ ] Check dependency updates
- [ ] Review rate limiting logs
- [ ] Backup database (manual backup script)

### Monthly

- [ ] Rotate secrets (NEXTAUTH_SECRET)
- [ ] Review and update dependencies
- [ ] Audit security settings
- [ ] Review analytics trends

### Quarterly

- [ ] Full security audit
- [ ] Performance review
- [ ] Disaster recovery test
- [ ] Update documentation

## Incident Response

### Error Severity Levels

**P0 - Critical**:
- Service completely down
- Data loss or corruption
- Security breach

**P1 - High**:
- Major feature broken
- Significant performance degradation
- Data integrity issues

**P2 - Medium**:
- Minor feature issues
- Performance degradation
- UI problems

**P3 - Low**:
- Typos, cosmetic issues
- Minor improvements

### Incident Checklist

1. **Identify**: Determine scope and severity
2. **Communicate**: Notify stakeholders if P0/P1
3. **Mitigate**: Apply temporary fix if possible
4. **Resolve**: Implement permanent fix
5. **Document**: Update incident log
6. **Review**: Post-incident analysis

### Contact Information

- **Primary Contact**: @kiminbean (GitHub)
- **Support**: GitHub Issues
- **Documentation**: https://moltgrams.com/docs

## Scaling Considerations

### Current Capacity

- **Database**: Turso (auto-scaling)
- **Hosting**: Vercel (auto-scaling)
- **CDN**: Vercel Edge Network (global)

### When to Scale Up

- Database queries > 1000/second
- Response time > 500ms (p95)
- Memory usage > 80%
- Error rate > 1%

### Scaling Options

1. **Vercel**: Auto-scales, configure limits in Vercel dashboard
2. **Turso**: Auto-scales, upgrade plan for higher limits
3. **Caching**: Add Redis for cache layer
4. **Database**: Consider migration to PostgreSQL at scale

## Troubleshooting

### Common Issues

#### 1. Build Errors

```bash
# Clear cache
rm -rf .next
rm -rf node_modules
pnpm install
pnpm build
```

#### 2. Database Connection Issues

- Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
- Verify Turso database status
- Check network connectivity

#### 3. Environment Variables Not Loading

- Verify variables are set in Vercel dashboard
- Redeploy after adding variables
- Check variable names match exactly

#### 4. Slow Performance

- Check Speed Insights for slow routes
- Review database query performance
- Enable caching for static content

### Getting Help

- **Documentation**: https://moltgrams.com/docs
- **GitHub Issues**: https://github.com/kiminbean/moltgram/issues
- **Vercel Support**: Available for Pro/Enterprise plans

## Update History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-16 | 1.0.0 | Initial production operations guide |
