# AI Voice Recorder — Run Guide

## 1. Environment Setup
Fill in the `.env` file in the root directory:
```bash
# Get your keys
SUPABASE_URL=xxxx
SUPABASE_ANON_KEY=xxxx
GEMINI_API_KEY=xxxx
```

## 2. Database Setup
1. Go to your **Supabase dashboard**.
2. Open the **SQL Editor**.
3. Copy the contents of `database/schema.sql` and run them.
4. Create an **S3 bucket** in Supabase Storage named `audio-chunks`. Make it public for easy access.

## 3. Run Backend (Port 5000)
```bash
cd backend
npm run dev
```

## 4. Run Frontend Website (Port 5173)
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Install it as a PWA by clicking "Install" in the browser's address bar.

## 5. Run Mobile Android App (Expo)
```bash
cd mobile
npm install --quiet
npx expo start
```
Download the **Expo Go** app on your Android phone and scan the QR code that appears in your terminal. Ensure your phone and PC are on the same Wi-Fi network.

## Project Structure
- `backend/`: Node.js project for API, transcription, and summarization.
- `frontend/`: React PWA using Vite and pure CSS for a premium look.
- `mobile/`: React Native (Expo) app sharing the same backend for a native experience.
- `database/`: PostgreSQL schema for Supabase.
# voice
