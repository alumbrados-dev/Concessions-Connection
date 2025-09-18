import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Security function to sanitize logs and redact sensitive information
function sanitizeForLogging(data: any, path: string): string {
  if (!data || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  // Deep clone to avoid modifying original data
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Redact sensitive fields from any object recursively
  function redactSensitiveData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => redactSensitiveData(item));
    }
    
    if (obj && typeof obj === 'object') {
      const result = { ...obj };
      
      // List of sensitive field names to redact
      const sensitiveFields = [
        'token', 'accessToken', 'refreshToken', 'jwt', 'password', 'secret',
        'authorization', 'auth', 'apiKey', 'key', 'privateKey', 'sessionId',
        'sessionToken', 'csrfToken', 'verificationToken', 'resetToken'
      ];
      
      // Redact sensitive fields
      for (const field of sensitiveFields) {
        if (result.hasOwnProperty(field)) {
          result[field] = '[REDACTED]';
        }
      }
      
      // Also check for fields that might contain email addresses in auth context
      if (path.includes('/auth/') && result.hasOwnProperty('email')) {
        const email = result.email;
        if (typeof email === 'string' && email.includes('@')) {
          // Redact email but keep domain for debugging
          const [localPart, domain] = email.split('@');
          result.email = `${localPart.substring(0, 2)}***@${domain}`;
        }
      }
      
      // Recursively sanitize nested objects
      for (const key in result) {
        if (result.hasOwnProperty(key) && typeof result[key] === 'object') {
          result[key] = redactSensitiveData(result[key]);
        }
      }
      
      return result;
    }
    
    return obj;
  }
  
  const redacted = redactSensitiveData(sanitized);
  return JSON.stringify(redacted);
}

// Environment validation for production readiness
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredVars = {
    JWT_SECRET: process.env.JWT_SECRET,
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,
    VITE_SQUARE_APPLICATION_ID: process.env.VITE_SQUARE_APPLICATION_ID,
    VITE_SQUARE_LOCATION_ID: process.env.VITE_SQUARE_LOCATION_ID,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS // Comma-separated list of admin emails
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (isProduction && missingVars.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables for production:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nProduction deployment requires all environment variables to be configured.');
    console.error('The server cannot start without proper security configuration.');
    process.exit(1);
  }

  if (missingVars.length > 0) {
    console.warn('⚠️  WARNING: Missing environment variables (development mode):');
    missingVars.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('Some features may not work properly without proper configuration.\n');
  } else {
    console.log('✅ All required environment variables are configured');
  }
}

// Validate environment on startup
validateEnvironment();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // For auth endpoints, only log minimal metadata to prevent token leakage
      if (path.includes('/auth/')) {
        if (capturedJsonResponse && res.statusCode >= 200 && res.statusCode < 300) {
          logLine += ` :: [AUTH_SUCCESS]`;
        } else if (capturedJsonResponse) {
          // For auth errors, show sanitized error info only
          const sanitized = sanitizeForLogging(capturedJsonResponse, path);
          logLine += ` :: ${sanitized}`;
        }
      } else if (capturedJsonResponse) {
        // For non-auth endpoints, sanitize the response data
        const sanitized = sanitizeForLogging(capturedJsonResponse, path);
        logLine += ` :: ${sanitized}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
