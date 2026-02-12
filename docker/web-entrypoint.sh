#!/bin/sh
set -e

# Replace placeholders in built JS files with actual environment variables
# This allows the same image to be used across different environments
HTML_DIR="/usr/share/nginx/html"

if [ -n "$SUPABASE_URL" ]; then
  find "$HTML_DIR" -type f \( -name "*.js" -o -name "*.html" \) \
    -exec sed -i "s|__HABITY_SUPABASE_URL__|${SUPABASE_URL}|g" {} +
fi

if [ -n "$SUPABASE_ANON_KEY" ]; then
  find "$HTML_DIR" -type f \( -name "*.js" -o -name "*.html" \) \
    -exec sed -i "s|__HABITY_SUPABASE_ANON_KEY__|${SUPABASE_ANON_KEY}|g" {} +
fi

if [ -n "$ENABLE_SIGNUP" ]; then
  find "$HTML_DIR" -type f \( -name "*.js" -o -name "*.html" \) \
    -exec sed -i "s|__HABITY_ENABLE_SIGNUP__|${ENABLE_SIGNUP}|g" {} +
fi

echo "Environment variables injected into static files"

# Start nginx
exec nginx -g "daemon off;"
