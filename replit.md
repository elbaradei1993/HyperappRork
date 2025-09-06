# HyperAPP - Location-Based Safety Application

## Overview
HyperAPP is a React Native Expo application designed for location-based safety and social features. The app uses Supabase for backend services, includes mapping functionality, and provides emergency/safety features for users.

## Recent Changes (September 6, 2025)
- Successfully configured project for Replit environment
- Resolved dependency conflicts with React versions and ajv module
- Set up proper Expo web development server on port 5000
- Configured deployment settings for production with serve package
- Environment variables properly configured for Supabase integration

## Project Architecture
- **Frontend**: React Native with Expo framework
- **Web Support**: Expo web for browser deployment
- **Backend**: Supabase (PostgreSQL database + authentication)
- **Mapping**: React Native Maps and React Leaflet for web
- **State Management**: Zustand for global state
- **Query Management**: TanStack React Query
- **Routing**: Expo Router with file-based routing

## Key Components
- Authentication system (login/signup)
- Location tracking and mapping
- Emergency SOS functionality
- Social pulse features
- User profiles and settings
- Alert/notification system

## Environment Configuration
- Development server runs on port 5000 with Expo
- Supabase integration via EXPO_PUBLIC_SUPABASE_ANON_KEY
- Uses tunnel mode for proper Replit proxy compatibility

## Deployment
- Configured for autoscale deployment
- Build process: `npx expo export --platform web`
- Production server: `npx serve -s dist -l 5000`

## Dependencies
- Main dependencies include Expo SDK, React Native, Supabase client
- Development dependencies include TypeScript, ESLint, serve package
- Resolved conflicts with legacy peer dependencies flag