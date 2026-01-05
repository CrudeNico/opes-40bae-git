# Firebase Hosting Setup Guide

Follow these steps to deploy your React app to Firebase Hosting.

## Prerequisites

1. **Create a Firebase Project** (if you haven't already):
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" or select an existing project
   - Follow the setup wizard
   - **Note your Project ID** (you'll need this)

2. **Enable Firebase Hosting**:
   - In your Firebase project, go to "Hosting" in the left sidebar
   - Click "Get started"
   - Follow the initial setup (you can skip the CLI commands for now)

## Installation Steps

### Step 1: Install Firebase CLI

You can install Firebase CLI globally or use it via npx:

```bash
# Option 1: Install globally
npm install -g firebase-tools

# Option 2: Use npx (no installation needed)
# Just use 'npx firebase-tools' instead of 'firebase' in commands
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open your browser to authenticate. If you prefer command-line only:
```bash
firebase login --no-localhost
```

### Step 3: Update Project Configuration

1. Open `.firebaserc` file
2. Replace `YOUR_PROJECT_ID` with your actual Firebase Project ID

You can find your Project ID in:
- Firebase Console → Project Settings → General tab
- Or in the Firebase Console URL: `https://console.firebase.google.com/project/YOUR_PROJECT_ID`

### Step 4: Build and Deploy

```bash
# Build your React app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Or use the combined command:
```bash
npm run deploy
```

## What I Need From You

Please provide:
1. **Your Firebase Project ID** - I'll update the `.firebaserc` file with it
2. **Confirmation** that you've:
   - Created a Firebase project
   - Enabled Firebase Hosting in the Firebase Console
   - Installed Firebase CLI (or confirm you'll use npx)

## After Deployment

Once deployed, Firebase will give you a URL like:
`https://YOUR_PROJECT_ID.web.app`

You can also set up a custom domain in the Firebase Console under Hosting settings.

## Troubleshooting

- If you get "Firebase CLI not found", install it: `npm install -g firebase-tools`
- If deployment fails, make sure you've run `npm run build` first
- Check that your `.firebaserc` has the correct Project ID

