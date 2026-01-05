# Connecting Firebase to GitHub Repository

Your repository is already connected to GitHub: `https://github.com/CrudeNico/opes-40bae-git.git`

## Method 1: Firebase Console GitHub Integration (Recommended)

This sets up automatic deployments when you push to your GitHub repo.

### Step 1: Connect GitHub to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Firebase project
3. Go to **Hosting** in the left sidebar
4. Click **"Get started"** if you haven't enabled Hosting yet
5. Click on **"Connect GitHub"** or **"Add new repository"** button
6. You'll be asked to:
   - Authorize Firebase to access your GitHub account
   - Select your repository: `CrudeNico/opes-40bae-git`
   - Choose the branch (usually `main` or `master`)
   - Set the build configuration:
     - **Build command**: `npm run build`
     - **Output directory**: `dist`
     - **Root directory**: `/` (or leave empty)

### Step 2: Firebase will automatically:
- Create a GitHub Actions workflow file (`.github/workflows/firebase-hosting-merge.yml`)
- Set up automatic deployments on push to your main branch
- Deploy previews for pull requests

### Step 3: First Deployment

After connecting:
- Firebase will trigger the first deployment automatically
- Or you can manually trigger it from the Firebase Console
- Your site will be live at: `https://YOUR_PROJECT_ID.web.app`

## Method 2: Manual Deployment (Alternative)

If you prefer manual deployments or want to deploy now:

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Update `.firebaserc`** with your Project ID:
   - Replace `YOUR_PROJECT_ID` with your actual Firebase Project ID

4. **Deploy**:
   ```bash
   npm run deploy
   ```

## What You Need to Provide

1. **Your Firebase Project ID** - I'll update `.firebaserc` with it
2. **Confirmation** that you've:
   - Created/enabled Firebase Hosting in the Firebase Console
   - Connected your GitHub repository through Firebase Console (Method 1)

## After Setup

Once connected:
- Every push to your main branch will automatically deploy
- Pull requests will get preview deployments
- You can see deployment history in Firebase Console

## Troubleshooting

- If GitHub connection fails, make sure you authorize Firebase in GitHub
- Check that your repository is public or you've granted Firebase access to private repos
- Verify the build command and output directory match your Vite setup (`npm run build` → `dist` folder)

