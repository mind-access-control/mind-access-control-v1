#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if anon key is available
if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env file"
    exit 1
fi

# Export the anon key for Flyway
export SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Run the migration
npm run migrate

# Clear the key from environment
unset SUPABASE_ANON_KEY 