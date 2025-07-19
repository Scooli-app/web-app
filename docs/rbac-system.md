# Scooli RBAC (Role-Based Access Control) System

## Overview

Scooli implements a comprehensive Role-Based Access Control (RBAC) system that manages user permissions across the platform. The system is built on top of Supabase and integrates seamlessly with Next.js middleware and API routes.

## Database Schema

### Core Tables

#### 1. `user_profiles`
Extended user profile information linked to Supabase Auth users.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  credits_remaining INTEGER DEFAULT 100,
  xp_points INTEGER DEFAULT 0,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_pro BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `roles`
Defines available roles in the system with hierarchical levels.

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  hierarchy_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Default Roles:**
- `teacher` (level 1) - Basic users, educators
- `curator` (level 2) - Community moderators and content curators
- `admin` (level 3) - Platform administrators
- `super_admin` (level 4) - Full system access

#### 3. `permissions`
Granular permissions that can be assigned to roles.

```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Permission Categories:**
- `documents` - Document management (read, create, edit, delete, share)
- `community` - Community features (access, post, comment, moderate, curate)
- `admin` - Administrative functions (access, users, analytics, system)
- `curriculum` - Curriculum processing (process, upload, manage)
- `ai` - AI generation features (generate, advanced, unlimited)

#### 4. `role_permissions` (Junction Table)
Many-to-many relationship between roles and permissions.

```sql
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);
```

## Database Relationships

```
auth.users (Supabase Auth)
    ↓ (1:1)
user_profiles
    ↓ (many:1)
roles ←────────────→ role_permissions ←────────────→ permissions
    (1:many)              (many:many)              (many:1)
```

### Relationship Details

1. **auth.users → user_profiles**: One-to-one relationship via `user_profiles.id`
2. **user_profiles → roles**: Many-to-one via `user_profiles.role_id`
3. **roles ↔ permissions**: Many-to-many via `role_permissions` junction table

## Database Functions

### `get_user_profile_with_permissions(user_id UUID)`

Returns complete user profile with aggregated permissions.

```sql
CREATE OR REPLACE FUNCTION get_user_profile_with_permissions(user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),
  credits_remaining INTEGER,
  xp_points INTEGER,
  role_id INTEGER,
  role_name VARCHAR(50),
  hierarchy_level INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  permissions TEXT[]
);
```

**Usage:**
```sql
SELECT * FROM get_user_profile_with_permissions('user-uuid-here');
```

### `user_with_permissions` View

Convenience view that calls the function with `auth.uid()`.

```sql
CREATE VIEW user_with_permissions AS
SELECT * FROM get_user_profile_with_permissions(auth.uid());
```

**Note:** This view only works for authenticated users in RLS context, not with service role tokens.

## Permission System

### Permission Naming Convention

Permissions follow the pattern: `category.action`

Examples:
- `documents.read` - View documents
- `documents.create` - Create new documents
- `admin.access` - Access admin panel
- `community.moderate` - Moderate community content

### Permission Categories

#### Documents (`documents.*`)
- `documents.read` - View and read documents
- `documents.create` - Create new documents  
- `documents.edit` - Edit existing documents
- `documents.delete` - Delete documents
- `documents.share` - Share documents with others

#### Community (`community.*`)
- `community.access` - Access community features
- `community.post` - Post content to community
- `community.comment` - Comment on community posts
- `community.moderate` - Moderate community content
- `community.curate` - Curate community resources

#### Admin (`admin.*`)
- `admin.access` - Access admin panel
- `admin.users.view` - View user information
- `admin.users.edit` - Edit user accounts
- `admin.users.roles` - Manage user roles
- `admin.analytics` - View platform analytics
- `admin.system` - System-level administration

#### AI (`ai.*`)
- `ai.generate` - Use AI generation features
- `ai.advanced` - Use advanced AI models
- `ai.unlimited` - Unlimited AI generations

#### Curriculum (`curriculum.*`)
- `curriculum.process` - Process curriculum documents
- `curriculum.upload` - Upload curriculum files
- `curriculum.manage` - Manage curriculum database

## Application Integration

### Authentication Flow

1. **User Authentication**: Handled by Supabase Auth
2. **Profile Loading**: Fetch user profile with permissions using `get_user_profile_with_permissions()`
3. **Permission Checking**: Validate permissions for routes and API endpoints

### Middleware Protection

File: `src/middleware.ts`

```typescript
// Get user profile with permissions
const { data: userProfileData } = await serviceSupabase
  .rpc("get_user_profile_with_permissions", { user_id: session.user.id });

profile = userProfileData?.[0] as UserProfile | null;

// Check permissions
const hasPermissions = userHasAllPermissions(profile, routeConfig.requiredPermissions);
```

### API Route Protection

File: `src/lib/auth/apiAuth.ts`

```typescript
export async function validateAPIRequest(req: NextRequest, config: APIProtectionConfig) {
  // Extract token and validate user
  const { data: { user } } = await supabase.auth.getUser(token);
  
  // Get profile with permissions
  const { data: userProfileData } = await supabase
    .rpc("get_user_profile_with_permissions", { user_id: user.id });
    
  // Validate access
  return validateAPIAccess(profile, config);
}
```

### Route Configuration

File: `src/lib/auth/routeConfig.ts`

```typescript
export const ROUTE_CONFIGS: RouteConfig[] = [
  {
    path: "/documents",
    requiresAuth: true,
    requiredPermissions: ["documents.read"],
    redirectTo: "/login",
  },
  {
    path: "/api/documents", 
    requiresAuth: true,
    requiredPermissions: ["documents.read"],
  },
];
```

### Permission Helper Functions

File: `src/lib/auth/utils.ts`

```typescript
// Check single permission
userHasPermission(profile, "documents.read")

// Check any of multiple permissions  
userHasAnyPermission(profile, ["documents.read", "documents.edit"])

// Check all permissions required
userHasAllPermissions(profile, ["admin.access", "admin.users.view"])
```

## TypeScript Types

### Core Types

```typescript
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role_id: number;
  credits_remaining: number;
  xp_points: number;
  is_pro: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Extended fields from function/joins
  role_name?: string;
  hierarchy_level?: number;
  permissions?: string[];
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
  hierarchy_level: number;
  permissions?: string[];
}

interface Permission {
  id: number;
  name: string;
  description?: string;
  category: string;
}
```

### Configuration Types

```typescript
interface RouteConfig {
  path: string;
  requiresAuth?: boolean;
  requiredPermissions?: string[];
  requiresAllPermissions?: boolean; // Default true
  redirectTo?: string;
}

interface APIProtectionConfig {
  requiresAuth?: boolean;
  requiredPermissions?: readonly string[];
  requiresAllPermissions?: boolean; // Default true
  allowedEmails?: readonly string[];
}
```

## Security Considerations

### Row Level Security (RLS)

- **Enabled** on `user_profiles`, `documents` tables
- **Disabled** on `roles`, `permissions`, `role_permissions` (config tables)
- **Service role access** bypasses RLS for administrative operations

### Token Handling

- **Service role tokens** used in API routes and middleware for permission fetching
- **User tokens** validated but don't work with `user_with_permissions` view
- **Function calls** work with both token types

### Best Practices

1. **Use functions over views** for service role contexts
2. **Validate permissions** at both middleware and API route level
3. **Cache permissions** in user session/context when possible
4. **Audit permission changes** through role_permissions table
5. **Use hierarchical roles** for inheritance patterns

## Common Usage Patterns

### Adding New Permissions

1. Insert into `permissions` table:
```sql
INSERT INTO permissions (name, description, category) 
VALUES ('documents.export', 'Export documents to various formats', 'documents');
```

2. Assign to roles:
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'teacher' AND p.name = 'documents.export';
```

### Creating New Roles

1. Create role:
```sql
INSERT INTO roles (name, display_name, description, hierarchy_level)
VALUES ('moderator', 'Moderador', 'Community content moderator', 2);
```

2. Assign permissions:
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'moderator' 
  AND p.name IN ('community.access', 'community.moderate');
```

### Checking User Permissions in Frontend

```typescript
import { useAuth } from '@/components/providers/AuthProvider';

function DocumentActions() {
  const { hasPermission } = useAuth();
  
  return (
    <div>
      {hasPermission('documents.edit') && (
        <button>Edit Document</button>
      )}
      {hasPermission('documents.delete') && (
        <button>Delete Document</button>
      )}
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Permission checks failing**: Ensure using `get_user_profile_with_permissions()` function, not view
2. **Middleware redirects**: Check route configuration and token validity
3. **API 403 errors**: Verify user has required permissions and token is valid
4. **RLS policy conflicts**: Disable RLS on config tables, enable on user data tables

### Debug Queries

```sql
-- Check user's current permissions
SELECT * FROM get_user_profile_with_permissions('user-uuid');

-- View all role-permission mappings
SELECT r.name as role_name, p.name as permission_name, p.category
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id  
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.hierarchy_level, p.category, p.name;

-- Find users with specific permission
SELECT up.email, r.name as role_name
FROM user_profiles up
JOIN roles r ON up.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.name = 'admin.access';
``` 