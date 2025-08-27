# GitHub Gold Mine - Authentication UI Wireframes

## Overview

This document provides detailed wireframes and UI specifications for the authentication system components.

## 1. Login/Landing Page

```
┌─────────────────────────────────────────────────────────────┐
│ [GitHub Gold Mine Logo]                    [About] [Contact] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           🔍 Discover Hidden GitHub Gems                    │
│                                                             │
│    Find abandoned repositories with high revival potential  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [🔍 Search repositories...]                       │   │
│  │                                                     │   │
│  │  [🔍 Search] [Sign in with GitHub to save results] │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Recent Discoveries                               │   │
│  │                                                     │   │
│  │ • awesome-ml-toolkit (Score: 92/100)               │   │
│  │ • react-dashboard-pro (Score: 88/100)              │   │
│  │ • blockchain-analyzer (Score: 85/100)              │   │
│  │                                                     │   │
│  │ [Sign in to see personalized recommendations]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🚀 Why Sign In?                                     │   │
│  │                                                     │   │
│  │ ✓ Save and organize repositories                    │   │
│  │ ✓ Track analysis history                           │   │
│  │ ✓ Get personalized recommendations                 │   │
│  │ ✓ Advanced search and filtering                    │   │
│  │ ✓ Export analysis results                          │   │
│  │                                                     │   │
│  │ [🔗 Sign in with GitHub] [Learn More]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. GitHub OAuth Flow

### Step 1: OAuth Initiation
```
┌─────────────────────────────────────────────────────────────┐
│ [GitHub Gold Mine] → Redirecting to GitHub...               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    🔄 Connecting to GitHub                  │
│                                                             │
│              Please wait while we redirect you...           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🔗 You'll be redirected to GitHub to authorize    │   │
│  │     GitHub Gold Mine to access your profile        │   │
│  │                                                     │   │
│  │  We only request minimal permissions:              │   │
│  │  • Read your public profile                        │   │
│  │  • Access your email address                       │   │
│  │                                                     │   │
│  │  [Cancel] [Continue to GitHub]                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: OAuth Callback Processing
```
┌─────────────────────────────────────────────────────────────┐
│ [GitHub Gold Mine] → Setting up your account...             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ✅ Authentication Successful             │
│                                                             │
│                Setting up your personalized dashboard...    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🎉 Welcome to GitHub Gold Mine!                   │   │
│  │                                                     │   │
│  │  [👤 User Avatar] Hello, @username!                │   │
│  │                                                     │   │
│  │  We're preparing your personalized experience:     │   │
│  │                                                     │   │
│  │  ✓ Account created                                 │   │
│  │  ✓ Profile imported                                │   │
│  │  🔄 Loading recommendations...                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 3. Authenticated Navigation Header

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 GitHub Gold Mine]  [Dashboard] [Discover] [Saved] [Pro] │
│                                                             │
│                                    [🔔 3] [👤 @username ▼] │
└─────────────────────────────────────────────────────────────┘
```

### User Menu Dropdown
```
                                              ┌─────────────────┐
                                              │ 👤 @username    │
                                              │ user@email.com  │
                                              ├─────────────────┤
                                              │ 📊 Dashboard    │
                                              │ ⚙️  Settings    │
                                              │ 📈 Usage Stats  │
                                              │ 💳 Billing     │
                                              ├─────────────────┤
                                              │ 📚 Help        │
                                              │ 🐛 Report Bug  │
                                              ├─────────────────┤
                                              │ 🚪 Sign Out    │
                                              └─────────────────┘
```

## 4. User Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ [Header with user menu]                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 👋 Welcome back, @username!                                │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ 📊 Stats    │ │ 💾 Saved    │ │ 🔍 Searches │ │ 📈 Pro  │ │
│ │             │ │             │ │             │ │         │ │
│ │ 47 Analyzed │ │ 12 Saved    │ │ 23 Searches │ │ Upgrade │ │
│ │ This Month  │ │ Repos       │ │ This Week   │ │ Account │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🌟 Your Saved Repositories                             │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ awesome-ml-toolkit                    Score: 92/100 │ │ │
│ │ │ Machine learning toolkit for Python  [View] [❌]   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ react-dashboard-pro                   Score: 88/100 │ │ │
│ │ │ Professional React dashboard          [View] [❌]   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ [View All Saved Repositories]                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Recent Analysis History                              │ │
│ │                                                         │ │
│ │ • facebook/react - Analyzed 2 hours ago                │ │
│ │ • microsoft/vscode - Analyzed yesterday                │ │
│ │ • nodejs/node - Analyzed 3 days ago                    │ │
│ │                                                         │ │
│ │ [View Full History]                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 5. User Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│ [Header with user menu]                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚙️ Account Settings                                         │
│                                                             │
│ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
│ │ 👤 Profile  │ │ Profile Information                     │ │
│ │ 🔔 Notifications │ │                                     │ │
│ │ 🔒 Privacy  │ │ [👤 Avatar]                            │ │
│ │ 💳 Billing  │ │                                         │ │
│ │ 🔗 Connected│ │ Display Name: [John Doe            ]    │ │
│ │ 🗑️ Delete   │ │ Email: [john@example.com          ]    │ │
│ │             │ │ GitHub: @johndoe (Connected ✓)         │ │
│ │             │ │                                         │ │
│ │             │ │ Bio: [Optional bio text...         ]    │ │
│ │             │ │                                         │ │
│ │             │ │ [Save Changes] [Cancel]                 │ │
│ └─────────────┘ └─────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Notifications Settings
```
│ ┌─────────────────────────────────────────┐
│ │ 🔔 Notification Preferences             │
│ │                                         │
│ │ Email Notifications:                    │
│ │ ☑️ New high-potential repositories      │
│ │ ☑️ Analysis completion alerts           │
│ │ ☐ Weekly digest                        │
│ │ ☐ Product updates                      │
│ │                                         │
│ │ Browser Notifications:                  │
│ │ ☑️ Analysis completion                  │
│ │ ☐ New recommendations                  │
│ │                                         │
│ │ [Save Preferences]                      │
│ └─────────────────────────────────────────┘
```

## 6. Mobile Responsive Design

### Mobile Navigation
```
┌─────────────────────────┐
│ ☰ GitHub Gold Mine  👤 │
├─────────────────────────┤
│                         │
│ 🔍 Search repositories  │
│                         │
│ [Search Box]            │
│ [🔍 Search]             │
│                         │
│ 📊 Quick Stats          │
│ • 47 Analyzed           │
│ • 12 Saved              │
│ • 23 Searches           │
│                         │
│ 🌟 Saved Repos          │
│ [Repository cards...]   │
│                         │
└─────────────────────────┘
```

### Mobile Menu
```
┌─────────────────────────┐
│ ☰ Menu              ❌ │
├─────────────────────────┤
│ 👤 @username            │
│ user@email.com          │
├─────────────────────────┤
│ 📊 Dashboard            │
│ 🔍 Discover             │
│ 💾 Saved                │
│ 📈 Pro                  │
├─────────────────────────┤
│ ⚙️ Settings             │
│ 📚 Help                 │
│ 🚪 Sign Out             │
└─────────────────────────┘
```

## 7. Error States

### Authentication Error
```
┌─────────────────────────────────────────────────────────────┐
│ [Header]                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ⚠️ Authentication Failed                 │
│                                                             │
│              We couldn't sign you in with GitHub            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  This could be due to:                              │   │
│  │  • GitHub authorization was cancelled              │   │
│  │  • Network connection issues                       │   │
│  │  • Temporary GitHub service issues                 │   │
│  │                                                     │   │
│  │  [Try Again] [Contact Support]                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Session Expired
```
┌─────────────────────────────────────────────────────────────┐
│                    🔒 Session Expired                       │
│                                                             │
│              Your session has expired for security          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Please sign in again to continue                   │   │
│  │                                                     │   │
│  │  [🔗 Sign in with GitHub]                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Notes

### 1. Component Structure
- `AuthProvider` - Context for authentication state
- `LoginButton` - GitHub OAuth initiation
- `AuthCallback` - OAuth callback handler
- `ProtectedRoute` - Route protection wrapper
- `UserMenu` - User dropdown menu
- `UserDashboard` - Main user dashboard
- `UserSettings` - Settings management

### 2. State Management
- User authentication state
- Loading states for OAuth flow
- Error handling and display
- Session management

### 3. Responsive Design
- Mobile-first approach
- Collapsible navigation
- Touch-friendly interactions
- Optimized for various screen sizes

### 4. Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode support
- Focus management

This wireframe specification provides a comprehensive guide for implementing the authentication UI components with a focus on user experience and security.
