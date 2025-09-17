# Mr Food Truck - Mobile Food Truck Application

## Overview

Mr Food Truck is a full-stack mobile food truck application built with React and Express. The application connects customers with a food truck business, allowing users to browse menu items, place orders, and interact with an AI-powered voice assistant. The app is designed as a Progressive Web App (PWA) with Capacitor integration for mobile deployment, featuring real-time updates for inventory management and a comprehensive ordering system.

The application serves "Mr Food Truck" (also known as "Concessions Connection"), a family-run mobile food truck business, providing customers with an intuitive interface to explore menu items, view local events, and place orders while receiving personalized assistance through voice interaction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: React Context for cart and authentication, TanStack React Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Mobile**: Capacitor for native mobile app capabilities (camera, geolocation, push notifications)

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with WebSocket support for real-time features
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **Error Handling**: Centralized error middleware with proper HTTP status codes

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL with SSL encryption
- **Real-time**: WebSocket implementation for live inventory updates and order status

### Authentication and Authorization
- **Authentication Method**: Magic link authentication (email-based, passwordless)
- **Token Management**: Base64-encoded user ID tokens (development implementation)
- **Session Storage**: Server-side sessions stored in PostgreSQL
- **Authorization**: Bearer token validation on protected routes

### Core Features Implementation
- **Menu Management**: Dynamic menu with real-time stock updates and category filtering
- **Shopping Cart**: Persistent cart state with local storage backup
- **Voice Assistant**: AI-powered voice interaction using OpenAI APIs (Whisper for speech-to-text, TTS for text-to-speech, GPT-5 for conversation)
- **Real-time Updates**: WebSocket connections for inventory changes and order notifications
- **Location Services**: GPS integration for food truck location tracking
- **Event Management**: Local events and promotional advertisements system

## External Dependencies

### Third-Party Services
- **OpenAI**: GPT-5 for AI hostess conversations, Whisper for voice transcription, TTS-1 for speech synthesis
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Capacitor Plugins**: Native device access (camera, geolocation, push notifications)

### Key Libraries and Frameworks
- **Database**: Drizzle ORM with postgres.js driver for type-safe database operations
- **UI Framework**: Radix UI primitives for accessible components, Tailwind CSS for styling
- **State Management**: TanStack React Query for server state, React Context for client state
- **Development Tools**: Vite with React plugin, TypeScript for type safety, ESLint for code quality
- **Mobile Development**: Capacitor for cross-platform mobile deployment with native API access

### API Integrations
- **Voice Processing**: OpenAI Whisper API for speech-to-text conversion
- **AI Conversation**: OpenAI GPT-5 API for intelligent customer service interactions
- **Text-to-Speech**: OpenAI TTS API for voice response generation
- **Real-time Communication**: Custom WebSocket implementation for live updates

### Development and Deployment
- **Build System**: Vite for fast development and optimized production builds
- **Package Management**: npm with lockfile for dependency consistency
- **Environment Management**: Environment variables for API keys and database connections
- **Mobile Deployment**: Capacitor CLI for iOS and Android app generation