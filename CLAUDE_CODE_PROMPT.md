# 🚀 OPTIMIZED CLAUDE CODE PROMPT - ShilpSmith E-Commerce Transformation

## CONTEXT & OVERVIEW
You are developing a production-ready 3D printing e-commerce store for ShilpSmith (3D printing business). 
The current codebase is a Next.js 15 app with basic product catalog and WhatsApp ordering.
Goal: Build a scalable, feature-rich e-commerce platform with admin panel and future payment integration.
Target: 2026 modern UI standards, fully responsive, performance-optimized.

---

## PROJECT STRUCTURE
```
Tech Stack: Next.js 15 (App Router) + React 18 + Prisma + PostgreSQL + Tailwind CSS
Current Status: MVP with WhatsApp integration
Deployment: Vercel (production-ready)
```

---

## PHASE 1: CRITICAL FOUNDATIONS (PRIORITY)
**Focus:** Authentication, Database Upgrade, Input Validation, Error Handling

### Task 1.1: Admin Authentication System
**Objective:** Secure admin panel with JWT-based auth

**Deliverables:**
1. `lib/auth.ts` - NextAuth.js v5 configuration
   - Email/password authentication
   - JWT token management
   - Secure session handling
   - Admin role verification middleware

2. `app/api/auth/[...nextauth]/route.ts` - Auth API routes
   - Login endpoint
   - Logout endpoint
   - Token refresh
   - Session validation

3. `app/(auth)/admin-login/page.tsx` - Admin login UI
   - Email + password form
   - Error messages
   - Remember me option
   - Forgot password link

4. `middleware.ts` - Route protection
   - Protect `/admin` routes
   - Redirect unauthenticated users
   - Token verification

**Requirements:**
- Use bcryptjs for password hashing (already in package.json)
- Implement refresh token rotation
- Add rate limiting to prevent brute force
- Secure cookie settings (HttpOnly, SameSite, Secure)
- Store session in database (sessions table)
- Zero password logging or exposure

**Output Format:**
- TypeScript with full types
- Comprehensive error handling
- Security headers configured
- Console logs for debugging

---

### Task 1.2: Database Upgrade & Schema Extension
**Objective:** Migrate from SQLite to PostgreSQL and extend schema

**Deliverables:**
1. `prisma/schema.prisma` - Extended schema
   - Extend existing Product, Category, Admin models
   - Add: User, Order, OrderItem, Cart, CartItem, ProductVariant
   - Add: Address, Review, WishlistItem, DiscountCode, Settings, Analytics
   - Add: Session table for NextAuth
   - Proper relationships and constraints
   - Indexes for frequently queried fields

2. `prisma/migrations/` - New migration
   - Generated from schema changes
   - Includes all new tables
   - Data type safety with proper constraints

3. `lib/db.ts` - Database utility
   - Prisma client instance (singleton pattern)
   - Connection pooling setup
   - Error handling
   - Query optimization helpers

4. `prisma/seed.ts` - Seed script improvements
   - Seed sample products with variants
   - Create demo admin account (email: admin@shilpsmith.com, password: demo)
   - Populate categories
   - Create test orders for analytics

**Requirements:**
- PostgreSQL provider configuration
- Proper relationship cascading (onDelete options)
- UUID primary keys (optional, can use autoincrement)
- Soft deletes consideration for Orders/Products
- Timestamps (createdAt, updatedAt) on all models
- Unique constraints where needed

**Connection String Format:**
```
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
```

---

### Task 1.3: Input Validation & Type Safety
**Objective:** Validate all API inputs, prevent SQL injection, ensure type safety

**Deliverables:**
1. `lib/validators.ts` - Zod validation schemas
   - ProductCreateSchema, ProductUpdateSchema
   - OrderCreateSchema, OrderUpdateSchema
   - UserRegisterSchema, LoginSchema
   - AddressSchema, ReviewSchema
   - DiscountCodeSchema, CartItemSchema
   - Include custom validations (phone format, email, prices)
   - Error messages (can be translated later)

2. Update all API routes to use validators
   - Parse and validate request body
   - Return 400 with validation errors
   - Log validation failures for security

3. Create validation middleware
   - `lib/middleware/validateRequest.ts`
   - Reusable for all routes
   - Type-safe request body parsing

**Requirements:**
- All schemas strict with `strict()` in Zod
- Phone number validation for India (+91)
- Price validation (positive numbers)
- Slug generation and validation
- Email domain validation
- Refine custom rules where needed

---

### Task 1.4: Error Handling & Logging
**Objective:** Consistent error handling, logging, user feedback

**Deliverables:**
1. `lib/errors.ts` - Custom error classes
   - ApiError, ValidationError, AuthError, NotFoundError
   - Custom status codes
   - Structured error responses

2. `lib/logger.ts` - Logging utility
   - Console logging in development
   - Sentry integration setup (for production)
   - Request/response logging middleware
   - Error logging with context

3. Update all API routes
   - Wrap in try-catch blocks
   - Return consistent error format
   - Log errors with context (user, action, timestamp)

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid product data",
    "details": [
      { "field": "price", "message": "Price must be positive" }
    ]
  }
}
```

**Success Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Product created successfully"
}
```

---

## PHASE 2: E-COMMERCE ESSENTIALS
**Focus:** Shopping Cart, Checkout, Order Management, Email Notifications

### Task 2.1: Shopping Cart System
**Objective:** Client-side and server-side cart management

**Deliverables:**
1. `lib/store/cart.ts` - Zustand cart store
   - Add/remove/update cart items
   - Quantity management
   - Cart persistence to localStorage
   - Calculate totals, taxes, shipping
   - Variant selection handling
   - Clear cart on order completion

2. `components/shop/CartSheet.tsx` - Cart UI component
   - Side sheet with cart items
   - Update quantities with +/- buttons
   - Remove item option
   - Cart summary (subtotal, tax, total)
   - Proceed to checkout button
   - Empty cart message

3. `app/(shop)/cart/page.tsx` - Full cart page
   - Detailed cart display
   - Edit quantities, remove items
   - Coupon code input
   - Order summary sidebar
   - Continue shopping button
   - Checkout button (clear styling)

4. `app/api/cart/route.ts` - Cart API (optional, for sync)
   - Sync cart to server for logged-in users
   - Update cart after login
   - Cart validation (check stock, prices)

**Requirements:**
- Cart persists in localStorage
- Session-based cart for anonymous users
- Cart merging when user logs in
- Stock validation before adding
- Real-time price updates
- Remove expired discounts from cart
- Cart state synced across tabs (BroadcastChannel API)

---

### Task 2.2: Checkout Process & Order Creation
**Objective:** Multi-step checkout, address management, order confirmation

**Deliverables:**
1. `app/(shop)/checkout/page.tsx` - Checkout page
   - Step 1: Shipping Address (form or select saved)
   - Step 2: Billing Address (same as shipping / different)
   - Step 3: Payment Method (Razorpay / WhatsApp / COD)
   - Step 4: Order Review
   - Form validation with Zod
   - Address book integration
   - Progress indicator

2. `components/shop/AddressForm.tsx` - Reusable address form
   - Full name, phone, email, street, city, state, postal code
   - Country selector (India primary)
   - Validation feedback
   - Save address for future option

3. `components/shop/OrderReview.tsx` - Order summary
   - Line items with customization details
   - Pricing breakdown
   - Estimated delivery date
   - Coupon/discount applied
   - Edit cart button

4. `app/api/orders/route.ts` - Order creation API
   - Validate cart items (stock, prices)
   - Create Order record
   - Create OrderItem records
   - Clear cart
   - Return order number
   - Trigger email notification

5. `app/(shop)/order/[id]/page.tsx` - Order confirmation page
   - Order number and date
   - Delivery address
   - Order items with prices
   - Order status timeline
   - Contact support button
   - Continue shopping button

**Requirements:**
- Order number generation (format: ORD-20260520-12345)
- Automatic order status: "pending"
- Calculate taxes based on state
- Shipping cost calculation
- Order total validation
- Error handling if cart changes during checkout
- Session-based order attribution
- Prevent duplicate orders (idempotency)

---

### Task 2.3: Email Notifications System
**Objective:** Transactional emails for orders, confirmations, updates

**Deliverables:**
1. `lib/email.ts` - Email service integration
   - Resend SDK setup (or SendGrid)
   - Email template rendering
   - Send email utility function
   - Retry logic for failed emails
   - Email logging

2. `lib/email/templates/` - Email templates
   - `orderConfirmation.tsx` - React email template
   - `orderShipped.tsx` - Shipping notification
   - `orderDelivered.tsx` - Delivery confirmation
   - `orderCancelled.tsx` - Cancellation notice
   - `welcomeEmail.tsx` - New customer email
   - `resetPassword.tsx` - Password reset link

3. Update `app/api/orders/route.ts`
   - Send order confirmation email after order creation
   - Include order details, items, total
   - Add WhatsApp message (optional fallback)

4. Add email sending to key flows
   - Payment confirmation (after Razorpay)
   - Order status updates
   - Admin notification on new order

**Requirements:**
- Use React Email for template creation
- Include order tracking link
- Professional email design
- Mobile responsive
- Branding and logo
- Company contact information
- Unsubscribe link (not applicable for transactional)

**Environment Variables:**
```
RESEND_API_KEY=...
ADMIN_EMAIL=orders@shilpsmith.com
```

---

### Task 2.4: Payment Gateway Integration - Razorpay
**Objective:** Accept online payments securely, handle callbacks

**Deliverables:**
1. `lib/payment.ts` - Razorpay setup
   - Initialize Razorpay instance with API key
   - Create order function (Razorpay order creation)
   - Verify payment signature function
   - Handle payment errors

2. `app/api/payments/razorpay/create-order/route.ts`
   - Accept order ID
   - Calculate amount and currency
   - Create Razorpay order
   - Return order ID to frontend

3. `app/api/payments/razorpay/verify/route.ts`
   - Verify payment signature (security critical)
   - Update Order.paymentStatus to "completed"
   - Update Order.status to "confirmed"
   - Send order confirmation email
   - Return success/failure

4. `components/shop/PaymentCheckout.tsx` - Payment UI
   - Razorpay embedded button/form
   - Loading state during payment
   - Error handling
   - Success message
   - Retry option on failure

5. Update checkout flow
   - Select payment method (Razorpay / WhatsApp / COD)
   - Show Razorpay button if selected
   - Handle payment response

**Requirements:**
- Production & test keys from environment
- Signature verification mandatory (don't skip!)
- Idempotent payment verification
- Handle duplicate verification requests
- Log all payment attempts
- PCI compliance (never store card data)
- Proper error messages for customers
- Admin notification on payment failures

**Environment Variables:**
```
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

---

## PHASE 3: PRODUCT VARIANTS & CUSTOMIZATION
**Focus:** Product options, pricing, inventory

### Task 3.1: Product Variants System
**Objective:** Size, color, material options with pricing

**Deliverables:**
1. `components/shop/VariantSelector.tsx` - Variant selection UI
   - Display variants (size, color, material)
   - Radio buttons or size grid
   - Price modifier display
   - Stock status per variant
   - Real-time total price calculation

2. Update product detail component
   - Show all variants
   - Variant images (if available)
   - Stock indicator (In Stock / Low Stock / Out of Stock)
   - Add variant to cart functionality

3. `app/api/products/[id]/variants/route.ts`
   - Get product with variants
   - Filter by availability

**Database:**
- ProductVariant table with priceModifier
- CartItem.variantId field
- OrderItem.variantId field

**Requirements:**
- Price calculation: base + modifier
- Stock validation per variant
- Variant combination rules (if applicable)
- Stock reduction on order
- Reorder alerts at 5 units

---

### Task 3.2: Product Customization Fields
**Objective:** Text engraving, custom colors, measurements

**Deliverables:**
1. Add customization fields to CartItem
   - Store as JSON: `{ engraving_text: "John", color: "#FF5733" }`

2. `components/shop/CustomizationForm.tsx`
   - Dynamic form fields based on product.customizable
   - Text input for engraving
   - Color picker for custom colors
   - Measurements (if applicable)
   - Real-time price calculation

3. Display customization in order
   - Show on order confirmation
   - Include in order emails

**Requirements:**
- Max text length validation
- Text preview visualization
- Price modifiers for customization (if applicable)
- Store customization details in order

---

## PHASE 4: ADMIN DASHBOARD ENHANCEMENTS
**Focus:** Order management, inventory, analytics

### Task 4.1: Order Management System
**Objective:** View, manage, and track orders

**Deliverables:**
1. `app/admin/orders/page.tsx` - Orders list
   - Table with columns: Order #, Date, Customer, Amount, Status, Actions
   - Filters by status, date range, customer
   - Search by order number
   - Pagination (20 per page)
   - Sort by date, amount
   - Bulk actions (mark as shipped, cancel)

2. `app/admin/orders/[id]/page.tsx` - Order detail page
   - Order number, date, customer details
   - Shipping address
   - Billing address
   - Items list with customization
   - Payment information
   - Order timeline (created → confirmed → processing → shipped → delivered)
   - Update order status
   - Add internal notes
   - Send customer notification button
   - Print label / invoice
   - Refund option (if applicable)

3. `app/api/admin/orders/route.ts`
   - GET all orders with filters
   - PUT to update order status
   - DELETE (soft delete)
   - Export to CSV

4. `components/admin/OrderStatusTimeline.tsx`
   - Visual timeline
   - Current status highlight
   - Timestamp for each status

**Requirements:**
- Real-time order notifications in admin panel
- Color-coded status indicators
- Customer context (name, phone, previous orders)
- Shipping integration prep (labels, tracking)
- Export capability (PDF, CSV)

---

### Task 4.2: Inventory Management
**Objective:** Track stock, reorder alerts

**Deliverables:**
1. `app/admin/inventory/page.tsx` - Inventory dashboard
   - Product list with stock levels
   - Low stock warning (< 5 units)
   - Stock status column
   - Variants stock breakdown
   - Edit stock buttons
   - Import/export stock CSV

2. `app/api/admin/inventory/route.ts`
   - Update stock
   - Batch update

3. Automated alerts
   - Notification when stock reaches threshold
   - Email to admin

**Requirements:**
- Real-time stock updates
- Prevent overselling
- Stock history/audit log
- Reorder quantity suggestions

---

### Task 4.3: Analytics Dashboard
**Objective:** Sales metrics, insights, trends

**Deliverables:**
1. `app/admin/analytics/page.tsx` - Analytics dashboard
   - Total revenue (this month, YTD)
   - Total orders (today, this month)
   - Average order value
   - Top 5 products (by sales, revenue)
   - Sales chart (line chart, daily/weekly/monthly toggle)
   - Revenue by category
   - Top customers
   - WhatsApp vs Online conversion
   - Payment method breakdown

2. `components/admin/SalesChart.tsx`
   - Recharts line chart
   - Dynamic date range
   - Interactive tooltips

3. `components/admin/MetricsCard.tsx`
   - KPI cards with trend indicators
   - Growth percentage vs previous period

4. `app/api/admin/analytics/route.ts`
   - Calculate metrics
   - Aggregate data by date
   - Performance optimizations (pre-calculate daily)

**Requirements:**
- Date range filters (today, week, month, year, custom)
- Comparison with previous period
- Export reports (PDF, CSV)
- Recurring metric calculations (cron job)

---

### Task 4.4: Customer Management
**Objective:** View customer info, order history, communication

**Deliverables:**
1. `app/admin/customers/page.tsx` - Customers list
   - Customer name, email, phone
   - Total orders, total spent
   - Last order date
   - Join date
   - Search/filter
   - Edit customer
   - Send message button

2. `app/admin/customers/[id]/page.tsx` - Customer detail
   - Contact information
   - All orders (linked)
   - Addresses
   - Email address
   - Order history timeline
   - Lifetime value
   - Communication history

3. `app/api/admin/customers/route.ts`
   - GET customers
   - Search customers

**Requirements:**
- Email list for bulk email campaigns (future)
- Customer segments (high-value, repeat, new)
- Activity timeline

---

### Task 4.5: Settings Management
**Objective:** Configure business settings

**Deliverables:**
1. `app/admin/settings/page.tsx` - Settings page
   - Company information
   - Contact details
   - Email configuration
   - Shipping settings (cost, regions)
   - Tax rate
   - WhatsApp number
   - Site-wide SEO settings
   - Email templates preview

2. `app/api/admin/settings/route.ts`
   - Get/update settings
   - Settings caching

**Requirements:**
- Settings table in database
- Cache settings in memory (Redis for production)
- Environment variable overrides

---

## PHASE 5: ADVANCED FEATURES (Optional but Scalable)

### Task 5.1: Product Search & Filtering
**Objective:** Help customers find products easily

**Implementation Notes:**
- Algolia or MeiliSearch for full-text search
- Filters: category, price range, customizable, rating
- Sort options: trending, newest, best-selling, price (asc/desc)
- Search suggestions/autocomplete

### Task 5.2: 3D Product Preview
**Objective:** Preview 3D models in browser

**Implementation Notes:**
- Three.js integration
- GLTF/GLB model loader
- Rotate, zoom, pan controls
- Material preview
- Model upload in admin

### Task 5.3: Customer Reviews & Ratings
**Objective:** Build social proof

**Implementation Notes:**
- Review creation after order fulfilled
- Rating system (1-5 stars)
- Review moderation
- Helpful voting
- Review display on product page

### Task 5.4: Discount & Coupon System
**Objective:** Promotional campaigns

**Implementation Notes:**
- Discount code management in admin
- Apply coupon in checkout
- Percentage/fixed discounts
- Minimum order value validation
- Expiration dates
- Usage limits per code and per customer

---

## QUALITY & PERFORMANCE REQUIREMENTS

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration
- No any types (use proper typing)
- Consistent naming conventions
- Component composition and reusability
- Error boundaries where needed
- Comprehensive comments/docs

### Performance
- Image optimization (Next.js Image component)
- Lazy loading for off-screen components
- Code splitting and dynamic imports
- API response caching (React Query)
- Database query optimization (select specific fields)
- Minimize bundle size
- Lighthouse score > 80

### Security
- Environment variable secrets management
- Input validation on all endpoints
- Rate limiting on API routes
- CORS configuration
- SQL injection prevention (Prisma)
- XSS prevention (React handles this)
- CSRF tokens for state-changing operations
- Secure password hashing (bcryptjs)
- No sensitive data logging

### Testing Requirements
- Unit tests for utilities and validators (Jest)
- Component tests for critical UI (React Testing Library)
- API route tests
- Integration tests for checkout flow
- Test coverage > 60%

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640), md (768), lg (1024), xl (1280)
- Touch-friendly buttons (min 44x44px)
- Test on various devices
- Horizontal scroll prevention

### Accessibility
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios (WCAG AA minimum)
- Form labels and error messages
- Focus indicators

---

## UI/UX STANDARDS (2026 Modern)

### Design Principles
- Clean, minimal aesthetic
- Generous whitespace
- Smooth animations (ease-in-out)
- Consistent spacing (4px grid)
- Strong typography hierarchy
- Modern color palette (avoid flat design)
- Micro-interactions for feedback
- Glassmorphism effects (already in navbar)

### Component Design
- Rounded corners (12-16px common)
- Soft shadows (not harsh)
- Border colors (slate-200 / slate-300)
- Hover states (opacity or slight scale)
- Loading states (skeleton, spinner)
- Empty states (illustration, copy)
- Error states (red, icon, message)
- Success states (green, icon, toast)

### Responsive Behavior
- Hide elements on mobile with class selectors
- Touch-friendly spacing on mobile
- Single column on mobile, multi-column on desktop
- Drawer menu for mobile navigation (already have)
- Flexible images and text sizing
- Test all breakpoints

---

## CODING STANDARDS & PATTERNS

### File Organization
```
- Use kebab-case for filenames
- Components in PascalCase
- Exports should be named (not default)
- Index files for cleaner imports
```

### Component Patterns
```typescript
// Use functional components with hooks
// Prop typing with interfaces
interface ComponentProps {
  title: string;
  onClick?: () => void;
}

export function MyComponent({ title, onClick }: ComponentProps) {
  return <div onClick={onClick}>{title}</div>;
}
```

### API Route Patterns
```typescript
// Always return consistent response format
// Proper HTTP status codes
// Comprehensive error handling
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = schemaValidation.parse(body);
    const result = await db.model.create({ data: validated });
    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
```

### Database Queries
```typescript
// Select only needed fields (not *)
// Use include/select judiciously
// Add proper error handling
const user = await db.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    orders: { select: { id: true, total: true } }
  }
});
```

---

## IMPLEMENTATION WORKFLOW

### Before Starting Each Task:
1. Review task requirements carefully
2. Identify all files that need changes
3. Check for dependencies or conflicts
4. Understand the data model changes needed
5. Plan database migrations if needed

### During Implementation:
1. Write TypeScript types first
2. Create database schema
3. Write API routes with validation
4. Create React components
5. Add error handling and logging
6. Write tests
7. Test on multiple devices/browsers

### After Completion:
1. Code review checklist
2. Security audit
3. Performance check (Lighthouse)
4. Mobile responsiveness test
5. Cross-browser compatibility
6. Update documentation

---

## ENVIRONMENT VARIABLES REQUIRED

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shilpsmith

# NextAuth
NEXTAUTH_SECRET=<32-char-random-string>
NEXTAUTH_URL=http://localhost:3000

# File Upload
BLOB_READ_WRITE_TOKEN=...

# Payment
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Email
RESEND_API_KEY=...
ADMIN_EMAIL=admin@shilpsmith.com

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210

# Monitoring (Optional)
SENTRY_DSN=...
```

---

## DEPLOYMENT INSTRUCTIONS

1. **Local Setup:**
   ```bash
   npm install
   npx prisma migrate dev
   npm run dev
   ```

2. **Vercel Deployment:**
   - Connect GitHub repo
   - Add environment variables
   - Deploy (automatic on push)
   - Run migrations: `npx prisma migrate deploy`

3. **Database (PostgreSQL):**
   - Use Vercel Postgres or PlanetScale
   - Initialize schema: `npx prisma migrate deploy`
   - Seed data: `npx prisma db seed`

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ Admin login works with JWT
- ✅ All API routes have input validation
- ✅ PostgreSQL connected and schema migrated
- ✅ Consistent error handling on all routes
- ✅ Zero console errors in production mode

### Phase 2 Complete When:
- ✅ Cart persists and syncs
- ✅ Checkout flow is complete
- ✅ Orders created in database
- ✅ Confirmation emails sent
- ✅ Razorpay integration verified (test mode)
- ✅ All transactions logged

### Phase 3 Complete When:
- ✅ Product variants working
- ✅ Customization fields save correctly
- ✅ Cart shows variant selections
- ✅ Orders show customization details

### Phase 4 Complete When:
- ✅ Admin sees all orders in dashboard
- ✅ Order status updates working
- ✅ Analytics showing real data
- ✅ Inventory tracking working
- ✅ Customer list populated

---

## TESTING CHECKLIST

### Functional Testing:
- [ ] Create admin account and login
- [ ] Add product with variants
- [ ] Browse products on homepage
- [ ] Add items to cart
- [ ] Update cart quantities
- [ ] Apply coupon
- [ ] Complete checkout with address
- [ ] Select Razorpay payment
- [ ] Complete test payment (Razorpay test mode)
- [ ] Verify order created
- [ ] Check email received
- [ ] Update order status in admin
- [ ] View analytics dashboard

### Cross-Browser Testing:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Performance Testing:
- [ ] Lighthouse score > 80
- [ ] Page load time < 3s
- [ ] Core Web Vitals: CLS < 0.1, LCP < 2.5s, FID < 100ms

### Security Testing:
- [ ] No secrets in code
- [ ] Passwords hashed
- [ ] SQL injection protected
- [ ] XSS protected
- [ ] CSRF tokens present
- [ ] API rate limiting working

---

## DOCUMENTATION

### For Each Feature, Document:
1. **API Endpoints** - Path, method, params, responses
2. **Database Models** - Fields, relationships, constraints
3. **Components** - Props, usage examples
4. **Configuration** - Environment variables, setup steps
5. **Error Codes** - List of possible errors and meanings

---

## IMPORTANT NOTES

⚠️ **CRITICAL:**
- Never commit `.env.local` file
- Always use environment variables for secrets
- Test payment flow in Razorpay test mode first
- Verify email delivery (test emails)
- Backup database before migrations
- Keep production database separate from development
- Use proper SQL indexes for high-traffic tables

🎯 **FOCUS AREAS:**
- User authentication security
- Payment transaction integrity
- Order data consistency
- Email delivery reliability
- Performance under load
- Mobile-first responsive design

✅ **BEST PRACTICES:**
- Keep components small and focused
- Use TypeScript strict mode
- Write self-documenting code
- Add comments for complex logic
- Use meaningful variable names
- Keep functions pure where possible
- Handle loading and error states
- Test on real devices before deployment

---

## OUTPUT EXPECTATIONS

For each task, provide:
1. ✅ Complete, production-ready code
2. ✅ TypeScript with full type safety
3. ✅ Proper error handling and validation
4. ✅ Comments explaining complex logic
5. ✅ Instructions for setup/configuration
6. ✅ Database migration files if needed
7. ✅ Environment variables needed
8. ✅ Testing approach (how to verify)

---

**Total Estimated Timeline:** 8-10 weeks for all phases
**Recommended Pace:** 2-3 features per week
**Team Size:** 1 developer (can scale with more)

---

**Let's build something amazing for ShilpSmith! 🚀**
