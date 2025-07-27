# Scooli Authentication & Authorization System

A comprehensive, role-based authentication and authorization system designed for maintainability, security, and ease of use.

## 🏗️ Architecture Overview

The system consists of several key components:

1. **Type System** (`types/auth.ts`) - Comprehensive TypeScript types for roles, permissions, and configurations
2. **Auth Utilities** (`utils.ts`) - Core permission checking and session management functions
3. **Route Protection** (`ProtectedRoute.tsx`) - Higher-order component for protecting client-side routes
4. **API Protection** (`apiAuth.ts`) - Middleware and utilities for protecting API endpoints
5. **Route Configuration** (`routeConfig.ts`) - Centralized route protection configuration
6. **Role Management** (`roleManager.ts`) - Administrative functions for managing user roles
7. **Enhanced Middleware** (`middleware.ts`) - Intelligent middleware that uses the configuration system

## 👥 User Roles & Hierarchy

```
super_admin (Level 4)
    ├── Full system access
    ├── Can manage all users and roles
    ├── Access to curriculum processing
    └── All permissions

admin (Level 3)
    ├── Platform administration
    ├── User management
    ├── Analytics access
    └── Community moderation

curator (Level 2)
    ├── Community moderation
    ├── Content curation
    └── All teacher permissions

teacher (Level 1)
    ├── Create and edit documents
    ├── Access community features
    └── Basic platform access
```

## 🔐 Permissions System

Permissions are automatically assigned based on roles:

```typescript
// Example permissions
"read_documents"        // View documents
"create_documents"      // Create new documents  
"edit_documents"        // Edit existing documents
"delete_documents"      // Delete documents
"access_community"      // Access community features
"moderate_community"    // Moderate community content
"manage_users"          // Manage user accounts
"access_admin"          // Access admin panel
"process_curriculum"    // Process curriculum documents
"access_analytics"      // View analytics data
```

## 🛡️ Route Protection

### Client-Side Route Protection

Use the `ProtectedRoute` component to protect pages:

```tsx
import { ProtectedRoute } from "@/lib/auth/ProtectedRoute";

// Basic authentication
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>

// Require specific role
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// Require specific permissions
<ProtectedRoute requiredPermissions={["moderate_community"]}>
  <ModerationPanel />
</ProtectedRoute>

// Multiple roles allowed
<ProtectedRoute requiredRole={["curator", "admin", "super_admin"]}>
  <CurationTools />
</ProtectedRoute>

// Custom redirect
<ProtectedRoute 
  requiredRole="admin" 
  redirectTo="/dashboard"
  fallback={<AccessDeniedPage />}
>
  <AdminSettings />
</ProtectedRoute>
```

### Server-Side Route Protection

Routes are automatically protected by the middleware using the centralized configuration in `routeConfig.ts`:

```typescript
// Add new protected routes here
export const ROUTE_CONFIGS: RouteConfig[] = [
  {
    path: "/admin",
    requiresAuth: true,
    requiredRole: ["admin", "super_admin"],
    requiredPermissions: ["access_admin"],
    redirectTo: "/dashboard",
  },
  // ... more routes
];
```

## 🔌 API Protection

### Method 1: Using validateAPIRequest (Recommended)

```typescript
import { validateAPIRequest } from "@/lib/auth/apiAuth";
import { API_CONFIGS } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  // Validate request
  const validation = await validateAPIRequest(request, API_CONFIGS.USER_DOCUMENTS);
  
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error?.message },
      { status: validation.error?.status || 500 }
    );
  }

  // Access user and profile
  const { user, profile } = validation;
  
  // Your API logic here...
}
```

### Method 2: Using Quick Helpers

```typescript
import { requireAuth, requireAdmin, requireSuperAdmin } from "@/lib/auth/apiAuth";

export async function GET(request: NextRequest) {
  const validation = await requireAuth(request);
  // or await requireAdmin(request);
  // or await requireSuperAdmin(request);
  
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error?.message },
      { status: validation.error?.status || 500 }
    );
  }
  
  // Your logic here...
}
```

### Method 3: Custom Configuration

```typescript
import { validateAPIRequest } from "@/lib/auth/apiAuth";

export async function POST(request: NextRequest) {
  const validation = await validateAPIRequest(request, {
    requiresAuth: true,
    requiredRole: "super_admin",
    requiredPermissions: ["process_curriculum"],
    allowedEmails: ["admin@scooli.app"], // Extra restriction
  });
  
  // Handle response...
}
```

## 🔧 Common API Configurations

Pre-configured protection patterns are available:

```typescript
import { API_CONFIGS } from "@/lib/auth/utils";

// Standard user operations
API_CONFIGS.USER_DOCUMENTS
API_CONFIGS.ADMIN_ONLY
API_CONFIGS.CURRICULUM_PROCESSING
API_CONFIGS.COMMUNITY_MODERATION
```

## 🎣 Auth Hook

Use the `useAuth` hook in client components:

```tsx
import { useAuth } from "@/lib/auth/ProtectedRoute";

function MyComponent() {
  const { 
    user, 
    profile, 
    loading, 
    isAuthenticated, 
    hasPermission, 
    hasRole 
  } = useAuth();

  if (loading) return <LoadingSpinner />;
  
  if (!isAuthenticated) return <LoginPrompt />;

  return (
    <div>
      <h1>Welcome, {profile?.full_name}!</h1>
      
      {hasRole("admin") && (
        <AdminPanel />
      )}
      
      {hasPermission("moderate_community") && (
        <ModerationTools />
      )}
    </div>
  );
}
```

## 👑 Role Management

### Administrative Functions

```typescript
import { roleManager } from "@/lib/auth/roleManager";

// Promote user to curator
await roleManager.promoteToGenerator(userId);

// Grant admin access
await roleManager.grantAdminRole(userId);

// Deactivate user
await roleManager.setUserActive(userId, false);

// Get all users
const { users } = await roleManager.getAllUsers();

// Check management permissions
const canManage = roleManager.canManageRoles(currentUserRole, targetUserRole);
```

### Creating Initial Admin

```typescript
// Run this once during setup with a user ID
await roleManager.createInitialAdmin(userId);
```

## 🔄 Database Schema

Your `user_profiles` table should include:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'teacher',
  credits_remaining INTEGER DEFAULT 100,
  xp_points INTEGER DEFAULT 0,
  is_pro BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add role constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_role 
CHECK (role IN ('teacher', 'curator', 'admin', 'super_admin'));
```

## ⚡ Performance Benefits

1. **Centralized Configuration**: All route protection rules in one place
2. **Automatic Middleware**: Routes are protected automatically based on configuration
3. **Efficient Caching**: User profiles are cached during request lifecycle
4. **Minimal Database Calls**: Smart session and profile fetching
5. **Type Safety**: Full TypeScript support prevents configuration errors

## 🔒 Security Features

1. **Role Hierarchy**: Higher roles automatically include lower role permissions
2. **Account Status Checking**: Inactive accounts are automatically blocked
3. **Permission Granularity**: Fine-grained permission system
4. **Email Allowlisting**: Support for restricting access to specific email addresses
5. **Secure Defaults**: All routes require explicit configuration to be accessible

## 🚀 Getting Started

1. **Add protection to a new page**:
   ```tsx
   // Wrap your page component
   <ProtectedRoute requiredPermissions={["read_documents"]}>
     <MyPage />
   </ProtectedRoute>
   ```

2. **Protect a new API route**:
   ```typescript
   // Add to your API handler
   const validation = await validateAPIRequest(request, API_CONFIGS.USER_DOCUMENTS);
   ```

3. **Add a new protected route**:
   ```typescript
   // Add to routeConfig.ts
   {
     path: "/my-new-route",
     requiresAuth: true,
     requiredPermissions: ["some_permission"],
   }
   ```

## 🛠️ Migration from Old System

The new system automatically handles all the routes that were previously manually configured in the old middleware. No changes needed for existing protected routes - they're now covered by the centralized configuration.

## 🐛 Troubleshooting

1. **Route not protected**: Check that it's included in `routeConfig.ts`
2. **API returning 401**: Verify the user is authenticated and has required permissions
3. **Infinite redirects**: Check redirect targets in route configuration
4. **Permission denied**: Verify user role has the required permissions in `utils.ts`

This system provides a robust, scalable foundation for authentication and authorization in the Scooli platform while remaining easy to maintain and extend. 