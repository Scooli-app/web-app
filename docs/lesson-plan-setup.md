# Lesson Plan Editor Setup

This document explains how to set up the lesson plan editor feature.

## Database Setup

### 1. Run the SQL Schema

Copy and paste the contents of `scripts/setup-database.sql` into your Supabase SQL editor and run it.

This will create:

- `documents` table with proper RLS policies
- Indexes for performance
- Triggers for automatic timestamp updates

### 2. Verify RLS Policies

The following RLS policies should be created:

- Users can view their own documents
- Users can insert their own documents
- Users can update their own documents
- Users can delete their own documents

## Authentication Requirements

The lesson plan editor requires user authentication. Make sure:

1. **User is logged in** before accessing `/lesson-plan`
2. **Supabase Auth** is properly configured
3. **Session cookies** are being set correctly

## Troubleshooting

### RLS Policy Error

If you get the error: `"new row violates row-level security policy for table \"documents\""`

**Solutions:**

1. **Check Authentication**: Ensure the user is properly authenticated
2. **Verify RLS Policies**: Run the SQL setup script again
3. **Check User ID**: The `user_id` field must match the authenticated user's ID

### Debug Steps

1. Check if user is authenticated:

   ```javascript
   const {
     data: { user },
   } = await supabase.auth.getUser();
   console.log("User:", user);
   ```

2. Verify RLS policies exist:

   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'documents';
   ```

3. Test with a simple insert:
   ```sql
   INSERT INTO documents (user_id, title, document_type)
   VALUES ('your-user-id', 'Test', 'lesson_plan');
   ```

## Features

### ✅ Working Features

- ✅ Document creation with initial prompt
- ✅ Rich text editor with auto-save
- ✅ AI chat with document context
- ✅ Real-time streaming responses
- ✅ Debounced saving (3-second delay)
- ✅ Authentication protection

### 🔧 Technical Details

- **Database**: Supabase with RLS
- **Authentication**: Supabase Auth
- **API**: Next.js API routes
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS with Scooli design system

## Usage

1. Navigate to `/lesson-plan`
2. Enter a description of the lesson plan you want to create
3. Start editing in the rich text editor
4. Use the AI chat to get suggestions and improvements
5. Changes are automatically saved every 3 seconds

## API Endpoints

- `POST /api/documents` - Create new document
- `GET /api/documents` - List user documents
- `GET /api/documents/[id]` - Get specific document
- `PUT /api/documents/[id]` - Update document
- `POST /api/documents/[id]/chat` - AI chat with document context
