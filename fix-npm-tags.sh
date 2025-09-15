#!/bin/bash
# Script to fix npm dist-tags for webssh2_client

echo "This script will fix the npm dist-tags for webssh2_client"
echo "You'll need to provide your npm OTP when prompted"
echo ""

# Move v2.0.0 from alpha to latest
echo "Moving v2.0.0 to latest tag..."
npm dist-tag add webssh2_client@2.0.0 latest

echo ""
echo "Current dist-tags:"
npm view webssh2_client dist-tags

echo ""
echo "Done! The dist-tags should now be:"
echo "  latest: 2.0.0"
echo "  alpha: (should point to latest alpha version if any)"