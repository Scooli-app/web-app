# Scooli Credit System Documentation

## 🎯 **Overview**

The Scooli credit system implements a hybrid model that balances user growth with operational costs:

- **Free Users**: Start with 100 credits (Welcome Package), earn more through community contributions
- **Pro Users**: Unlimited generation, but keep their remaining credits if they cancel subscription
- **Database-Level Logic**: All credit operations handled by database functions for consistency

## 🏗️ **Architecture**

### **Database Functions**

All credit logic is implemented at the database level using PostgreSQL functions:

#### **1. `check_and_deduct_credits(user_id, credits_required)`**
- **Purpose**: Atomic check and deduction operation
- **Pro Users**: Always return `can_generate = true`, credits unchanged
- **Free Users**: Check if sufficient credits, deduct if available
- **Returns**: `{can_generate, reason, credits_remaining, is_pro}`

#### **2. `add_user_credits(user_id, credits_to_add)`**
- **Purpose**: Add credits for community contributions
- **Works for**: Both free and Pro users
- **Returns**: `{success, new_credits_remaining, error_message}`

#### **3. `update_user_pro_status(user_id, is_pro)`**
- **Purpose**: Update Pro subscription status
- **Used by**: Subscription management system
- **Returns**: `{success, error_message}`

#### **4. `get_user_credit_status(user_id)`**
- **Purpose**: Get current credit status
- **Returns**: `{credits_remaining, is_pro, has_unlimited_generation}`

## 💰 **Credit Logic**

### **Pro Users (is_pro = true)**
```sql
-- Pro users can always generate
IF user_profile.is_pro THEN
  RETURN QUERY SELECT TRUE, 'Pro user - unlimited generation', credits_remaining, TRUE;
END IF;
```

**Benefits:**
- ✅ **Unlimited Generation**: No credit checks for AI generation
- ✅ **Keep Credits**: Credits remain unchanged when generating
- ✅ **Fallback Protection**: If subscription lapses, they keep remaining credits

### **Free Users (is_pro = false)**
```sql
-- Free users need sufficient credits
IF credits_remaining >= credits_required THEN
  -- Deduct credits
  UPDATE user_profiles SET credits_remaining = credits_remaining - credits_required;
  RETURN QUERY SELECT TRUE, 'Credits deducted', new_credits_remaining, FALSE;
END IF;
```

**Limitations:**
- ⚠️ **Credit Required**: Each generation costs credits
- ⚠️ **Limited Supply**: Welcome Package (100 credits) + community earnings
- ⚠️ **Upgrade Incentive**: Designed to encourage Pro subscription

## 🔄 **Usage Examples**

### **1. Generate Content (Recommended)**
```typescript
import { CreditService } from "@/services/api/credit.service";

// Check and deduct credits atomically
const result = await CreditService.checkAndDeductCredits(userId, 1);

if (result.canGenerate) {
  // Proceed with AI generation
  const aiResponse = await generateContent(prompt);
  
  // Credits already deducted (for free users) or unchanged (for Pro users)
  console.log(`Remaining credits: ${result.creditsRemaining}`);
} else {
  // Handle insufficient credits
  console.log(`Cannot generate: ${result.reason}`);
}
```

### **2. Add Credits (Community Rewards)**
```typescript
// User earned credits through community contribution
const result = await CreditService.addCredits(userId, 10);

if (result.success) {
  console.log(`Credits added! New total: ${result.newCreditsRemaining}`);
} else {
  console.log(`Error: ${result.error}`);
}
```

### **3. Update Pro Status (Subscription Management)**
```typescript
// User upgraded to Pro
const result = await CreditService.updateProStatus(userId, true);

if (result.success) {
  console.log("User upgraded to Pro successfully");
} else {
  console.log(`Error: ${result.error}`);
}
```

### **4. Get Credit Status**
```typescript
const status = await CreditService.getCreditStatus(userId);

if (status) {
  console.log(`Credits: ${status.creditsRemaining}`);
  console.log(`Pro User: ${status.isPro}`);
  console.log(`Unlimited Generation: ${status.hasUnlimitedGeneration}`);
}
```

## 🛡️ **Security & Consistency**

### **Database-Level Security**
- **Atomic Operations**: Check and deduct in single transaction
- **Race Condition Prevention**: Database locks prevent concurrent issues
- **Data Integrity**: All operations validated at database level

### **Application-Level Security**
- **RLS Policies**: Users can only access their own credit data
- **Service Role**: Admin operations use service role for credit management
- **Audit Trail**: All credit changes logged with timestamps

## 📊 **Credit Costs**

### **Generation Costs**
- **Simple Generation**: 1 credit (lesson plans, activities)
- **Complex Generation**: 2 credits (full tests, presentations)
- **Advanced Features**: 3 credits (curriculum analysis, RAG queries)

### **Earning Credits**
- **Share Resource**: +5 credits (approved by community)
- **High Rating**: +2 credits (4+ star rating)
- **Downloads**: +1 credit (per 10 downloads)
- **Curator Reward**: +10 credits (monthly bonus)

## 🔧 **Implementation in API Routes**

### **Example: Document Generation API**
```typescript
// src/app/api/generate/route.ts
export async function POST(req: Request) {
  const { userId, prompt, contentType } = await req.json();
  
  // Check credits and deduct atomically
  const creditResult = await CreditService.checkAndDeductCredits(userId, 1);
  
  if (!creditResult.canGenerate) {
    return NextResponse.json(
      { error: creditResult.reason },
      { status: 402 } // Payment Required
    );
  }
  
  // Proceed with generation (credits already handled)
  const generatedContent = await generateAI(prompt);
  
  return NextResponse.json({
    content: generatedContent,
    creditsRemaining: creditResult.creditsRemaining,
    isPro: creditResult.isPro,
  });
}
```

## 🎯 **Business Logic**

### **Pro User Benefits**
1. **Unlimited Generation**: No credit limits for any AI features
2. **Advanced Models**: Access to GPT-4.1 for complex tasks
3. **Priority Support**: Faster response times
4. **Keep Credits**: If subscription lapses, credits remain available

### **Free User Journey**
1. **Welcome Package**: 100 credits to start
2. **Community Participation**: Earn credits through contributions
3. **Natural Upgrade**: Eventually run out, creating upgrade incentive
4. **Credit Preservation**: Credits earned through community stay forever

### **Subscription Management**
```typescript
// When user subscribes to Pro
await CreditService.updateProStatus(userId, true);

// When subscription lapses
await CreditService.updateProStatus(userId, false);
// User keeps their remaining credits for future use
```

## 🚀 **Migration Guide**

### **For Existing Code**
```typescript
// OLD: Separate check and deduct
const canGenerate = await CreditService.canGenerateContent(userId);
if (canGenerate.canGenerate) {
  await CreditService.deductCredits(userId, 1);
  // Generate content...
}

// NEW: Atomic operation
const result = await CreditService.checkAndDeductCredits(userId, 1);
if (result.canGenerate) {
  // Generate content (credits already handled)
}
```

### **Database Migration**
```sql
-- Run the migration to create credit functions
\i src/migrations/create_credit_management_triggers.sql
```

## 📈 **Monitoring & Analytics**

### **Key Metrics**
- **Credit Usage**: Track generation patterns
- **Pro Conversion**: Monitor upgrade rates
- **Community Engagement**: Credit earning patterns
- **Revenue Impact**: Pro subscription correlation

### **Credit Analytics**
```sql
-- Credit usage by user type
SELECT 
  is_pro,
  AVG(credits_remaining) as avg_credits,
  COUNT(*) as user_count
FROM user_profiles 
GROUP BY is_pro;
```

---

This credit system provides a **scalable, secure, and user-friendly** foundation for Scooli's monetization strategy while maintaining excellent user experience for both free and Pro users. 