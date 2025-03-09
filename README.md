# 🍽️ Restaurant Management System

A comprehensive restaurant management system built with Strapi, featuring multi-language support, subscription plans, and a complete ecosystem for restaurant owners and customers.

## 🚀 Features

### Platform Website (Admin System)
- Multi-language management (German and English by default)
- Website content management
- Subscription plan management
- Admin user management
- Analytics dashboard
- Restaurant management
- Subscription management
- System settings
- Payment management
- Live chat with restaurant owners

### Restaurant Panel (Restaurant Owners)
- Multi-language restaurant management
- Restaurant page content management
- Subscription plan management
- Restaurant user management
- Analytics dashboard
- Restaurant profile management
- Menu and category management
- Order management
- Customer management
- Discount management
- Live chat with customers (Advanced plan only)

### Customer Service (Restaurant Customers)
- Language preferences
- User account management
- Food ordering
- Payment processing
- Reviews and ratings
- Discount usage
- Live chat with restaurants (for restaurants with Advanced plan)

## 🛠️ Technical Architecture

The system is built with the following technologies:
- **Backend**: Strapi Headless CMS
- **Database**: MySQL
- **Authentication**: JWT via Strapi Users & Permissions plugin
- **Internationalization**: Strapi i18n plugin

### Content Types
- Subscription Plans
- Restaurants
- Menu Categories
- Menu Items
- Orders
- Reviews
- Discounts
- Chats
- Subscriptions
- Languages
- Pages
- Blog Posts
- Blog Categories
- Blog Tags
- Transactions
- Invoices

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MySQL database

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Restaurant_App
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Configure the database
Create a `.env` file in the root directory based on the `.env.example` file:
```
HOST=0.0.0.0
PORT=1337
APP_KEYS=<your-app-keys>
API_TOKEN_SALT=<your-api-token-salt>
ADMIN_JWT_SECRET=<your-admin-jwt-secret>
TRANSFER_TOKEN_SALT=<your-transfer-token-salt>
JWT_SECRET=<your-jwt-secret>

# Database
DATABASE_CLIENT=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=restaurant_app
DATABASE_USERNAME=<your-database-username>
DATABASE_PASSWORD=<your-database-password>

# Payment Gateways
# PayPal
PAYPAL_API_KEY=<your-paypal-api-key>
PAYPAL_API_SECRET=<your-paypal-api-secret>
PAYPAL_WEBHOOK_SECRET=<your-paypal-webhook-secret>

# Visa
VISA_API_KEY=<your-visa-api-key>
VISA_API_SECRET=<your-visa-api-secret>
VISA_WEBHOOK_SECRET=<your-visa-webhook-secret>

# Mastercard
MASTERCARD_API_KEY=<your-mastercard-api-key>
MASTERCARD_API_SECRET=<your-mastercard-api-secret>
MASTERCARD_WEBHOOK_SECRET=<your-mastercard-webhook-secret>

# Platform Settings
PLATFORM_FEE_PERCENTAGE=0.15
```

4. Create the database
```bash
npm run create-database
# or
yarn create-database
```

5. Start the development server
```bash
npm run develop
# or
yarn develop
```

6. Access the admin panel
Open your browser and navigate to `http://localhost:1337/admin`

## 🌐 Multi-language Support

The system supports multiple languages, with German and English as the default languages. Additional languages can be added through the admin panel for restaurants with the Advanced subscription plan.

## 💰 Subscription Plans

The system offers three subscription plans for restaurants:

### Basic Plan
- Limited to 20 menu items
- Maximum 5 images
- No video uploads
- No additional languages
- No customization
- No reviews
- No discounts
- No live chat
- No advanced reports
- Description limited to 200 characters

### Normal Plan
- Limited to 50 menu items
- Maximum 20 images
- Maximum 2 videos
- No additional languages
- No customization
- Reviews enabled
- Discounts enabled
- No live chat
- No advanced reports
- Description limited to 500 characters

### Advanced Plan
- Unlimited menu items
- Unlimited images
- Unlimited videos
- Additional languages enabled
- Customization enabled
- Reviews enabled
- Discounts enabled
- Live chat enabled
- Advanced reports enabled
- Unlimited description length

## 🔒 Plan Restrictions

The system enforces subscription plan restrictions at the controller level. This ensures that restaurants can only access features and resources according to their subscription plan. The restrictions include:

- Maximum number of menu items
- Maximum number of images and videos
- Access to additional languages
- Access to reviews, discounts, and live chat features
- Maximum description length
- Access to advanced reports

## 📊 Advanced Reporting

The system provides advanced reporting capabilities for restaurants with the Advanced subscription plan. The reports include:

### Sales Reports
- Daily, weekly, monthly, and yearly sales reports
- Comparison with previous periods
- Top-selling menu items
- Sales by hour of day
- Revenue prediction based on historical data

### Customer Reports
- Customer spending analysis
- Order frequency
- Average order value
- Customer loyalty metrics

### Settlement Reports
- Platform fee calculations
- Restaurant payout details
- Transaction history

## 💳 Payment Management

The system integrates with multiple payment gateways to process payments for orders and subscriptions:

- PayPal
- Visa
- Mastercard

The payment system includes:

- Transaction recording
- Invoice generation
- Automatic subscription renewal
- Payment webhooks for real-time updates
- Restaurant settlement calculations

## ⏱️ Automated Tasks

The system includes automated tasks that run on a schedule:

- Subscription renewal (daily at 1:00 AM)
- Invoice reminders for overdue invoices (daily at 2:00 AM)

## 📚 Documentation

For more information about Strapi, check out the following resources:
- [Strapi Documentation](https://docs.strapi.io)
- [Strapi Tutorials](https://strapi.io/tutorials)
- [Strapi Blog](https://strapi.io/blog)

## 🧩 API Endpoints

### Report Endpoints
- `GET /reports/sales/:restaurantId` - Generate a sales report
- `GET /reports/customers/:restaurantId` - Generate a customer report
- `GET /reports/settlement/:restaurantId` - Generate a settlement report

### Payment Webhook Endpoints
- `POST /payment/webhooks/paypal` - Handle PayPal webhook
- `POST /payment/webhooks/visa` - Handle Visa webhook
- `POST /payment/webhooks/mastercard` - Handle Mastercard webhook
