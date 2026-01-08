#!/bin/bash
# Keepsake Supabase Setup Helper
# This script helps you configure your Supabase credentials

echo "🚀 Keepsake Supabase Setup"
echo "=========================="
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

# Get Supabase URL
echo "📍 Step 1: Enter your Supabase Project URL"
echo "   (Example: https://abcdefghijk.supabase.co)"
read -p "   URL: " SUPABASE_URL

# Validate URL format
if [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
    echo "❌ Invalid URL format. Should be: https://xxxxx.supabase.co"
    exit 1
fi

# Get Supabase Anon Key
echo ""
echo "🔑 Step 2: Enter your Supabase anon public key"
echo "   (The long string starting with 'eyJ...')"
read -p "   Key: " SUPABASE_ANON_KEY

# Validate key format (basic check)
if [[ ! $SUPABASE_ANON_KEY =~ ^eyJ ]]; then
    echo "⚠️  Warning: Key doesn't start with 'eyJ'. Make sure you copied the 'anon public' key, not the 'service_role' key!"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create .env.local file
cat > .env.local << EOF
# Supabase Configuration for Keepsake
# Generated on $(date)

VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF

echo ""
echo "✅ Success! .env.local file created!"
echo ""
echo "📋 Next steps:"
echo "   1. Set up your database tables (see SUPABASE_SETUP.md)"
echo "   2. Create storage buckets (see SUPABASE_SETUP.md)"
echo "   3. Test your connection!"
echo ""
echo "🔒 Important: .env.local is in .gitignore and won't be committed"
echo ""
