# AI Voice Assistant - Backend

A robust Node.js/Express backend API for the AI Voice Assistant system, providing AI-powered conversations, email services, calendar integration, and resume management.

## Features

- **AI Assistant API**: Intelligent conversation endpoints powered by Perplexity AI
- **Email Integration**: Automated email sending with Nodemailer
- **Calendar Integration**: Google Calendar API integration for meeting scheduling
- **Resume Management**: PDF resume serving and data management
- **Rate Limiting**: API protection with express-rate-limit
- **Security**: Helmet.js for security headers and CORS protection
- **Type Safety**: Full TypeScript support with Zod validation

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Zod** - Schema validation
- **Google APIs** - Calendar integration
- **Nodemailer** - Email services
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - API rate limiting

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud Console account (for Calendar API)
- Email service credentials (Gmail, etc.)

### Installation

1. Clone this repository:
```bash
git clone <backend-repo-url>
cd ai-voice-assistant-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
src/
├── config/             # Configuration files
├── controllers/        # Route controllers
├── lib/               # Utility libraries
├── middlewares/       # Express middlewares
├── routes/            # API route definitions
├── schemas/           # Zod validation schemas
├── services/          # Business logic services
├── types/             # TypeScript type definitions
└── index.ts           # Application entry point

data/
├── resume.json        # Resume data
└── Avinash_Nayak.pdf  # Resume PDF
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run typecheck` - Run TypeScript type checking

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Service (Perplexity)
PERPLEXITY_API_KEY=your_perplexity_api_key

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password

# Google Calendar API
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### AI Assistant
- `POST /api/assistant/chat` - Send chat message to AI
- `POST /api/assistant/voice` - Process voice input

### Email
- `POST /api/email/send` - Send email

### Meetings
- `POST /api/meetings/schedule` - Schedule a meeting
- `GET /api/meetings` - Get scheduled meetings

### Resume
- `GET /api/resume` - Get resume data
- `GET /api/resume/download` - Download resume PDF

## Google Calendar Setup

1. Create a Google Cloud Project
2. Enable Google Calendar API
3. Create a Service Account
4. Generate a private key
5. Share the calendar with the service account email
6. Add credentials to `.env` file

## Email Setup

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_APP_PASSWORD`

## Development

### Running Tests

```bash
npm run test
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Deployment

### Environment Setup

1. Set `NODE_ENV=production` in environment variables
2. Configure production database if needed
3. Set up proper CORS origins
4. Configure rate limiting for production

### Build Process

```bash
npm run build
npm run start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
