# Authentication System

This directory contains the authentication system for Scooli, implementing role-based access control (RBAC) with Supabase.

## Components

### Core Files

- `client.ts` - Supabase client initialization
- `utils.ts` - Authentication utility functions
- `apiAuth.ts` - API authentication helpers
- `routeConfig.ts` - Route protection configuration
- `roleManager.ts` - Role management system
- `ProtectedRoute.tsx` - Component for protecting routes

## Common Issues & Troubleshooting

### Refresh Token Errors

If you encounter `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` when booting the app:

**Cause**: This happens when there's a stale or invalid refresh token stored in browser cookies.

**Solutions**:

1. **Clear browser cookies** for the application domain
2. **Clear localStorage** data for the app
3. **Hard refresh** the browser (Ctrl+F5 / Cmd+Shift+R)

**Prevention**: The app now includes automatic token error handling that:

- Detects invalid refresh tokens
- Automatically clears stale sessions
- Redirects users to login when needed

### Development Setup

For development, ensure these environment variables are set:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Token Persistence

- Client-side: Uses browser storage for session persistence
- Server-side: Uses service role key with `persistSession: false`
- Middleware: Implements caching to reduce database calls

## Error Handling

The system includes comprehensive error handling for:

- Invalid refresh tokens
- Expired sessions
- Missing permissions
- Network connectivity issues

All auth errors are logged for debugging purposes while maintaining user privacy.
