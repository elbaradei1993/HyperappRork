# Production Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Unit tests passing (>60% coverage)
- [ ] Integration tests passing
- [ ] E2E tests for critical paths

### Security
- [ ] Environment variables secured
- [ ] API keys rotated
- [ ] SSL certificates valid
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] SQL injection prevention verified

### Performance
- [ ] Bundle size optimized (<2MB)
- [ ] Images optimized and lazy loaded
- [ ] API calls cached appropriately
- [ ] Database queries optimized
- [ ] Indexes created for frequent queries
- [ ] CDN configured for static assets

### Compliance
- [ ] Privacy policy updated
- [ ] Terms of service finalized
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Age verification implemented
- [ ] Accessibility standards met

## CDN Configuration

### CloudFlare Setup
```javascript
// cdn-config.js
module.exports = {
  origin: 'https://api.pulseapp.com',
  cache: {
    images: '1 year',
    fonts: '1 year',
    css: '1 month',
    js: '1 month',
    api: {
      '/api/static/*': '1 hour',
      '/api/alerts/*': '5 minutes',
      '/api/user/*': 'no-cache'
    }
  },
  compression: {
    brotli: true,
    gzip: true
  },
  security: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline';"
    }
  }
};
```

### Asset Optimization
```bash
# Image optimization
npx sharp-cli resize 1024 --withoutEnlargement --optimize --progressive

# Bundle optimization
npx expo export --platform all --output-dir dist/
```

## Database Deployment

### Supabase Production Setup
1. **Enable Point-in-Time Recovery**
   - Dashboard > Settings > Database > Backups
   - Enable PITR with 7-day retention

2. **Connection Pooling**
   - Use connection pooler endpoint for serverless
   - Set pool_mode to 'transaction'
   - Max pool size: 100

3. **Read Replicas** (for scale)
   - Create read replica in different region
   - Route read queries to replica
   - Keep writes on primary

4. **Monitoring**
   - Enable query performance insights
   - Set up slow query alerts
   - Monitor connection pool usage

### Migration Strategy
```sql
-- Run migrations in transaction
BEGIN;
  -- Apply schema changes
  \i supabase_optimization.sql
  
  -- Verify changes
  SELECT * FROM pg_indexes WHERE tablename IN ('alerts', 'vibe_reports', 'sos_alerts');
  
  -- Create backup point
  SELECT pg_create_restore_point('pre_production_deploy');
COMMIT;
```

## API Deployment

### Rate Limiting Configuration
```typescript
// rateLimiter.ts
export const rateLimits = {
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5 // 5 auth attempts per 15 minutes
  },
  alerts: {
    windowMs: 60 * 1000,
    max: 10 // 10 alerts per minute
  },
  sos: {
    windowMs: 60 * 1000,
    max: 3 // 3 SOS alerts per minute
  }
};
```

### Caching Strategy
```typescript
// cacheConfig.ts
export const cacheConfig = {
  redis: {
    host: process.env.REDIS_HOST,
    port: 6379,
    ttl: {
      userProfile: 300, // 5 minutes
      alerts: 60, // 1 minute
      staticData: 3600, // 1 hour
      vibeReports: 120 // 2 minutes
    }
  },
  cdn: {
    staticAssets: 31536000, // 1 year
    dynamicContent: 300 // 5 minutes
  }
};
```

## Monitoring & Analytics

### Sentry Configuration
```typescript
// sentry.config.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.ReactNativeTracing({
      tracingOrigins: ['localhost', 'api.pulseapp.com', /^\//],
      routingInstrumentation: Sentry.reactNavigationIntegration(),
    }),
  ],
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  },
});
```

### Analytics Setup
```typescript
// analytics.config.ts
export const analyticsConfig = {
  mixpanel: {
    token: process.env.MIXPANEL_TOKEN,
    trackAutomaticEvents: true,
    trackCrashes: true,
  },
  googleAnalytics: {
    trackingId: process.env.GA_TRACKING_ID,
    trackScreenViews: true,
    trackAppLifecycleEvents: true,
  },
  customEvents: {
    'sos_triggered': ['location', 'severity'],
    'alert_created': ['type', 'severity'],
    'vibe_reported': ['mood', 'safety_level'],
    'contact_added': ['relationship'],
  }
};
```

## Deployment Process

### 1. Staging Deployment
```bash
# Build for staging
expo build:ios --release-channel staging
expo build:android --release-channel staging

# Run tests
npm run test:e2e:staging

# Verify metrics
npm run metrics:staging
```

### 2. Production Deployment
```bash
# Create production build
expo build:ios --release-channel production
expo build:android --release-channel production

# Submit to stores
expo upload:ios
expo upload:android
```

### 3. Gradual Rollout
- Start with 1% of users
- Monitor crash rates and performance
- Increase to 10%, 50%, 100% over 1 week
- Have rollback plan ready

### 4. Post-Deployment
- Monitor error rates for 24 hours
- Check performance metrics
- Review user feedback
- Address critical issues immediately

## Rollback Strategy

### Immediate Rollback Triggers
- Crash rate > 1%
- API error rate > 5%
- Core feature failure
- Security vulnerability discovered

### Rollback Process
```bash
# Revert to previous version
expo publish --release-channel production-rollback

# Notify users
npm run notify:rollback

# Investigate issues
npm run logs:analyze --from="2 hours ago"
```

## Performance Benchmarks

### Target Metrics
- App launch: < 2 seconds
- Screen navigation: < 300ms
- API response: < 500ms (p95)
- Map load: < 1 second
- SOS trigger: < 100ms

### Monitoring Dashboard
```typescript
// metrics.ts
export const performanceMetrics = {
  appLaunch: benchmark.getPercentile('app_launch', 95),
  screenTransition: benchmark.getAverageTime('screen_transition'),
  apiLatency: benchmark.getPercentile('api_call', 95),
  mapRender: benchmark.getAverageTime('map_render'),
  sosResponse: benchmark.getPercentile('sos_trigger', 99),
};
```

## Disaster Recovery

### Backup Strategy
- Database: Daily automated backups, 30-day retention
- User data: Real-time replication to secondary region
- Configuration: Version controlled in Git
- Secrets: Stored in secure vault with versioning

### Recovery Time Objectives
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 5 minutes
- Degraded mode available: Yes (offline support)

### Emergency Contacts
- On-call engineer: +1-XXX-XXX-XXXX
- Database admin: +1-XXX-XXX-XXXX
- Security team: security@pulseapp.com
- Legal team: legal@pulseapp.com

## Maintenance Windows

### Scheduled Maintenance
- Time: Tuesdays, 2-4 AM PST
- Frequency: Monthly
- Notification: 48 hours in advance
- Duration: Maximum 2 hours

### Emergency Maintenance
- Notification: ASAP via in-app alert
- Communication: Status page updates every 30 minutes
- Compensation: Service credits for >4 hour outages

## Success Criteria

### Launch Week Metrics
- [ ] < 0.5% crash rate
- [ ] > 4.5 star average rating
- [ ] < 2% uninstall rate
- [ ] > 60% D1 retention
- [ ] < 10 critical bugs reported

### Long-term Goals
- [ ] 1M+ active users
- [ ] < 0.1% crash rate
- [ ] 99.9% uptime
- [ ] < 200ms average API latency
- [ ] > 70% monthly retention
