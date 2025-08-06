# StudioBrain Setup Guide

## Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your-actual-api-key-here
   ```

3. Get your OpenAI API key from: https://platform.openai.com/api-keys

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Important Notes

- **Never commit your `.env.local` file** - it contains sensitive API keys
- The `.gitignore` file is configured to exclude all environment files
- Use `.env.example` as a template for new deployments
- In production, set environment variables through your hosting platform's interface

## Security

- API keys are only accessible server-side
- Rate limiting is implemented to prevent API abuse  
- Build process now validates TypeScript and ESLint errors