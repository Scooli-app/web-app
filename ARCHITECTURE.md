# Scooli Architecture Documentation

## 🏗️ **Architecture Overview**

Scooli follows a **clean architecture** pattern with clear separation of concerns, organized into distinct layers:

```
src/
├── types/           # TypeScript type definitions
├── services/        # API services and business logic
├── stores/          # Zustand state management
├── components/      # React components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
├── migrations/      # Database migrations
└── app/             # Next.js app router pages
```

## 📁 **Folder Structure**

### **1. Types (`/src/types/`)**
Centralized TypeScript definitions for all data models:

```typescript
// Core entities
- User
- UserProfile
- Document
- LessonPlan
- CommunityResource

// API responses
- ApiResponse<T>
- PaginatedResponse<T>

// UI state
- UIState
- AuthState
- SearchFilters
```

### **2. Services (`/src/services/`)**
API layer with business logic separation:

```
services/
├── api/
│   ├── client.ts              # Base API client & error handling
│   ├── auth.service.ts        # Authentication operations
│   ├── auth-init.service.ts   # Auth initialization & session management
│   ├── user-profile.service.ts # User profile operations
│   ├── document.service.ts    # Document CRUD operations
│   └── lesson-plan.service.ts # Lesson plan operations
└── index.ts                   # Service exports
```

**Key Features:**
- **Error Handling**: Centralized error management with graceful fallbacks
- **Type Safety**: Full TypeScript support with proper interfaces
- **Consistent API**: Standardized request/response patterns
- **Supabase Integration**: Direct database operations with proper typing
- **Auth Context**: Client-side Supabase client for proper auth context
- **Graceful Fallbacks**: Handle missing profiles and auth errors gracefully

### **3. Stores (`/src/stores/`)**
Zustand-based state management:

```
stores/
├── auth.store.ts      # User authentication state
├── document.store.ts  # Document management state
├── ui.store.ts        # UI state (sidebar, theme, etc.)
└── index.ts          # Store exports & types
```

**Store Features:**
- **Reactive**: Automatic re-renders on state changes
- **Persistent**: Optional persistence with middleware
- **Type Safe**: Full TypeScript support
- **Modular**: Separate stores for different domains
- **Centralized Auth**: Single source of truth for auth state
- **No Refetching**: Avoid repeated API calls on route changes

### **4. Components (`/src/components/`)**
Organized by feature and complexity:

```
components/
├── layout/           # Layout components (Sidebar, Header, MainLayout)
├── forms/            # Form components (Auth, QuestionForm)
├── ui/               # Base UI components (shadcn/ui)
├── lesson-plan/      # Lesson plan specific components
├── providers/        # Context providers (AuthProvider, SupabaseProvider)
└── icons/            # Custom icon components
```

## 🔄 **Data Flow**

### **1. Authentication Flow**
```typescript
// Centralized auth initialization
AuthInitService.initializeAuth((state) => {
  // Handle auth state changes
  // User profile fetched automatically
});

// In components
const { user, profile, isAuthenticated } = useAuthStore();
```

### **2. Service Layer Pattern**
```typescript
// Service methods return consistent response patterns
const result = await DocumentService.createDocument(data, userId);
if (result.error) {
  // Handle error gracefully
  return;
}
// Use result.document
```

### **3. Store Integration**
```typescript
// Stores use services and manage state
const { createDocument, documents } = useDocumentStore();

const handleCreate = async () => {
  await createDocument(data, userId);
  // State automatically updates
};
```

### **4. Component Usage**
```typescript
// Components consume stores
const { user, signIn } = useAuthStore();
const { documents, fetchDocuments } = useDocumentStore();
```

## 🎯 **Key Benefits**

### **1. Performance**
- **Selective Re-renders**: Zustand only re-renders components that use changed state
- **Lazy Loading**: Services can be loaded on-demand
- **Optimistic Updates**: UI updates immediately, syncs with server
- **No Refetching**: Auth state initialized once, no repeated API calls

### **2. Scalability**
- **Modular Architecture**: Easy to add new features
- **Type Safety**: Prevents runtime errors
- **Consistent Patterns**: Standardized across the app
- **Database Triggers**: Automatic user profile creation

### **3. Maintainability**
- **Clear Separation**: Each layer has a specific responsibility
- **Testable**: Services and stores can be unit tested
- **Documented**: Clear interfaces and patterns
- **Error Handling**: Graceful fallbacks for all edge cases

### **4. Developer Experience**
- **TypeScript**: Full type safety and IntelliSense
- **Hot Reload**: Fast development with state persistence
- **Debugging**: Zustand DevTools integration
- **Clean Logs**: Proper error handling prevents console spam

## 🛠️ **Usage Examples**

### **Authentication Flow**
```typescript
// In component
const { user, profile, signIn, isLoading } = useAuthStore();

const handleLogin = async () => {
  await signIn(email, password);
  // User and profile state automatically updates
};
```

### **Document Management**
```typescript
// In component
const { documents, createDocument, fetchDocuments } = useDocumentStore();

useEffect(() => {
  fetchDocuments(1, 10, { is_public: true });
}, []);

const handleCreate = async () => {
  await createDocument(data, userId);
  // Documents list automatically updates
};
```

### **UI State Management**
```typescript
// In component
const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();

const toggleSidebar = () => {
  setSidebarCollapsed(!sidebarCollapsed);
};
```

### **User Profile Management**
```typescript
// In component
const { profile, updateProfile } = useAuthStore();

const handleUpdateProfile = async () => {
  await updateProfile({ full_name: "New Name" });
  // Profile state automatically updates
};
```

## 🔧 **Configuration**

### **Environment Variables**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Database Setup**
```sql
-- Automatic user profile creation via trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### **Store Persistence** (Optional)
```typescript
// Add to stores for persistence
import { persist } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

## 🧪 **Testing Strategy**

### **Unit Tests**
- **Services**: Test API calls and error handling
- **Stores**: Test state updates and actions
- **Components**: Test UI interactions

### **Integration Tests**
- **End-to-End**: Test complete user flows
- **API Integration**: Test service layer with real API
- **Auth Flow**: Test authentication and profile creation

## 📈 **Performance Optimizations**

### **1. Store Optimizations**
- **Selective Subscriptions**: Only subscribe to needed state
- **Memoization**: Use React.memo for expensive components
- **Batch Updates**: Group related state changes
- **Auth Caching**: Single auth initialization, no refetching

### **2. Service Optimizations**
- **Caching**: Cache frequently accessed data
- **Debouncing**: Debounce search requests
- **Pagination**: Load data in chunks
- **Graceful Errors**: Handle missing data without breaking

### **3. Component Optimizations**
- **Code Splitting**: Lazy load routes and components
- **Image Optimization**: Use Next.js Image component
- **Bundle Analysis**: Monitor bundle size
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🚀 **Deployment**

### **Build Process**
```bash
npm run build    # TypeScript compilation
npm run lint     # Code quality checks
npm run test     # Run tests
```

### **Environment Setup**
- **Development**: Local development with hot reload
- **Staging**: Pre-production testing
- **Production**: Optimized build with CDN

## 📚 **Best Practices**

### **1. State Management**
- Keep stores focused and small
- Use selectors for derived state
- Avoid storing UI state in global stores
- Centralize auth state to prevent refetching

### **2. Service Layer**
- Handle all API logic in services
- Use consistent error handling
- Implement proper retry logic
- Use client-side Supabase client for auth context

### **3. Type Safety**
- Define interfaces for all data
- Use strict TypeScript configuration
- Avoid `any` types
- Proper error type definitions

### **4. Performance**
- Monitor bundle size
- Use React DevTools for profiling
- Implement proper loading states
- Graceful error handling

### **5. Authentication**
- Single auth initialization
- Database triggers for profile creation
- Graceful handling of missing profiles
- Proper session management

## 🔐 **Security & RBAC**

### **Database-Level Security**
- **RLS Policies**: Row-level security on all tables
- **User Isolation**: Users can only access their own data
- **Role-Based Access**: Different permissions per user role
- **Service Role**: Admin operations use service role

### **Application-Level Security**
- **Auth Guards**: Route protection based on auth state
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: No sensitive data in error messages
- **Session Management**: Proper token handling

---

This architecture provides a **scalable, maintainable, and performant** foundation for the Scooli application, following modern React and TypeScript best practices with robust authentication and error handling. 