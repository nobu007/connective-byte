# ConnectiveByte Website Content Update Guide

This guide explains how to update website content without technical expertise. All content is stored in easy-to-edit JSON files, separate from the code.

## Table of Contents

1. [Content File Locations](#content-file-locations)
2. [Homepage Content](#homepage-content)
3. [About Page Content](#about-page-content)
4. [Site Configuration](#site-configuration)
5. [How to Update Content](#how-to-update-content)
6. [Validation and Testing](#validation-and-testing)
7. [Deployment Process](#deployment-process)
8. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Content File Locations

All content files are located in the `apps/frontend/content/` directory:

```
apps/frontend/content/
├── homepage.json       # Homepage content (hero, problems, values, CTA)
├── about.json          # About page content (mission, philosophy, vision)
└── site-config.ts      # Global site settings (navigation, footer, links)
```

**Important**: Always edit files in the `apps/frontend/content/` directory, not in other locations.

---

## Homepage Content

**File**: `apps/frontend/content/homepage.json`

This file controls all content on the homepage, including the hero section, problem statements, value propositions, social proof, and call-to-action sections.

### Structure Overview

```json
{
  "hero": { ... },           // Top section with headline and CTA
  "problems": [ ... ],       // Three problem cards
  "values": [ ... ],         // Three value proposition cards
  "socialProof": { ... },    // Version 0 program information
  "finalCTA": { ... }        // Bottom call-to-action section
}
```

### Hero Section

The hero section appears at the top of the homepage.

**Fields**:

- `headline` (required): Main headline text
- `subheadline` (required): Secondary headline text
- `ctaText` (required): Button text
- `ctaLink` (required): Button destination (e.g., "/contact")

**Example**:

```json
"hero": {
  "headline": "個を超え、知が立ち上がる場所",
  "subheadline": "AI時代の知的共創圏 ConnectiveByte",
  "ctaText": "無料相談に申し込む",
  "ctaLink": "/contact"
}
```

**How to update**:

1. Change the `headline` to update the main message
2. Change the `subheadline` to update the supporting text
3. Change the `ctaText` to update the button label
4. Change the `ctaLink` to update where the button goes (usually "/contact")

### Problems Section

Three problem cards that identify challenges faced by visitors.

**Fields per problem**:

- `icon` (required): Icon name from Lucide React (e.g., "user-x", "message-circle-x", "users-x")
- `title` (required): Problem headline
- `description` (required): Detailed problem description

**Example**:

```json
"problems": [
  {
    "icon": "user-x",
    "title": "個人完結型では疲弊するだけ",
    "description": "一人で全てを抱え込む働き方は限界に達しています。"
  }
]
```

**How to update**:

1. Keep exactly 3 problem cards
2. Update `title` and `description` to reflect current messaging
3. Icon names can be found at: https://lucide.dev/icons/

### Values Section

Three value proposition cards (Connect, Active, Collective).

**Fields per value**:

- `id` (required): Unique identifier ("connect", "active", or "collective")
- `icon` (required): Icon name from Lucide React
- `title` (required): Value name (e.g., "Connect")
- `subtitle` (required): Short description
- `description` (required): Detailed explanation
- `benefits` (required): Array of 3 benefit statements
- `color` (required): Color theme ("blue", "green", or "orange")

**Example**:

```json
"values": [
  {
    "id": "connect",
    "icon": "link",
    "title": "Connect",
    "subtitle": "思考を言語化し、他者と接続する",
    "description": "思考プロセスを可視化し、他者と共有可能な形に言語化する能力を身につけます。",
    "benefits": [
      "思考プロセスの可視化",
      "効果的なコミュニケーション",
      "知識の共有と蓄積"
    ],
    "color": "blue"
  }
]
```

**How to update**:

1. Keep exactly 3 value cards
2. Update `subtitle`, `description`, and `benefits` as needed
3. Keep `id` and `color` unchanged to maintain design consistency
4. Each value should have exactly 3 benefits

### Social Proof Section

Information about the Version 0 program and participant count.

**Fields**:

- `participantCount` (required): Number of participants (number, not text)
- `programName` (required): Program name (e.g., "Version 0")
- `badge` (required): Badge text (e.g., "参加者募集中")
- `description` (required): Program description

**Example**:

```json
"socialProof": {
  "participantCount": 10,
  "programName": "Version 0",
  "badge": "参加者募集中",
  "description": "初期プログラム参加者として、無料で体系的なAI協働スキルを学び..."
}
```

**How to update**:

1. Update `participantCount` as a number (no quotes): `10`, not `"10"`
2. Update `badge` to reflect current status
3. Update `description` to match current program offering

### Final CTA Section

Bottom call-to-action section with steps.

**Fields**:

- `headline` (required): Section headline
- `description` (required): Supporting text
- `steps` (required): Array of 3 step descriptions
- `ctaText` (required): Button text
- `ctaLink` (required): Button destination

**Example**:

```json
"finalCTA": {
  "headline": "まずは無料相談から",
  "description": "あなたの課題をお聞かせください。",
  "steps": [
    "フォームから申し込み",
    "オンライン面談（30分）",
    "プログラム参加"
  ],
  "ctaText": "無料相談に申し込む",
  "ctaLink": "/contact"
}
```

**How to update**:

1. Update `headline` and `description` as needed
2. Keep exactly 3 steps
3. Update step text to reflect current process

---

## About Page Content

**File**: `apps/frontend/content/about.json`

This file controls all content on the About page, including introduction, mission, philosophy, values, and vision.

### Structure Overview

```json
{
  "introduction": { ... },   // Opening section
  "mission": { ... },        // Mission statement
  "philosophy": { ... },     // Philosophical concepts
  "values": { ... },         // Core values
  "vision": { ... }          // Future vision
}
```

### Introduction Section

**Fields**:

- `title` (required): Section title
- `content` (required): Introduction text

**Example**:

```json
"introduction": {
  "title": "ConnectiveByteについて",
  "content": "ConnectiveByteは、AI時代における新しい学びと協創の場を提供します。"
}
```

### Mission Section

**Fields**:

- `title` (required): Section title
- `headline` (required): Mission headline
- `description` (required): Mission description

**Example**:

```json
"mission": {
  "title": "私たちのミッション",
  "headline": "次世代の学び：情報を鵜呑みにしないためのAI時代リテラシー教育",
  "description": "AI生成情報の無意識的受容に対する危機意識を持ち..."
}
```

### Philosophy Section

Contains two philosophical concepts with detailed explanations.

**Fields**:

- `title` (required): Section title
- `subtitle` (required): Section subtitle
- `concepts` (required): Array of 2 concept objects

**Concept fields**:

- `title` (required): Concept name
- `headline` (required): Concept headline
- `description` (required): Concept description
- `insight` (required): Key insight or conclusion

**Example**:

```json
"philosophy": {
  "title": "私たちの思想",
  "subtitle": "2つの異論から生まれた新しいアプローチ",
  "concepts": [
    {
      "title": "APIコスト経営論",
      "headline": "APIコストがKPIの時代、多くの人がまだ理解していない",
      "description": "AI連携の主戦場化は同意するが...",
      "insight": "無自覚な連携コスト膨張は..."
    }
  ]
}
```

**How to update**:

1. Keep exactly 2 concepts
2. Update text fields as needed
3. Use `\n\n` for paragraph breaks in longer text

### Values Section

Three core values with descriptions.

**Fields**:

- `title` (required): Section title
- `items` (required): Array of 3 value objects

**Value fields**:

- `title` (required): Value name
- `description` (required): Value description

**Example**:

```json
"values": {
  "title": "私たちの価値観",
  "items": [
    {
      "title": "Connect（接続）",
      "description": "知識・人・AI・時代をつなぐ結節点となる"
    }
  ]
}
```

**How to update**:

1. Keep exactly 3 values
2. Update `title` and `description` as needed

### Vision Section

**Fields**:

- `title` (required): Section title
- `content` (required): Vision statement (can include `\n\n` for paragraphs)
- `tagline` (required): Closing tagline

**Example**:

```json
"vision": {
  "title": "私たちのビジョン",
  "content": "「1人の脳で完結」路線は...\n\n真の解決策は...",
  "tagline": "理解されない孤独を吹き飛ばして、AI活用と思考連携で協創リーダーになる"
}
```

---

## Site Configuration

**File**: `apps/frontend/content/site-config.ts`

This TypeScript file controls global site settings like navigation, footer, and social links.

### Key Settings

**Site Information**:

```typescript
name: 'ConnectiveByte',
description: 'AI時代の知的共創圏 - 個を超え、知が立ち上がる場所',
url: 'https://connectivebyte.com',
```

**Social Links**:

```typescript
links: {
  twitter: 'https://twitter.com/connectivebyte',
  threads: 'https://threads.net/@connectivebyte',
},
```

**Navigation Menu**:

```typescript
navigation: [
  { name: 'ホーム', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'お問い合わせ', href: '/contact' },
],
```

**Footer**:

```typescript
footer: {
  tagline: '個を超え、知が立ち上がる場所',
  legalLinks: [
    { name: 'プライバシーポリシー', href: '/privacy' }
  ],
},
```

**How to update**:

1. Update social media URLs in the `links` section
2. Add or remove navigation items in the `navigation` array
3. Update footer tagline or legal links as needed
4. Keep the TypeScript syntax intact (commas, quotes, brackets)

---

## How to Update Content

### Step-by-Step Process

#### 1. Locate the File

Navigate to `apps/frontend/content/` and open the file you want to edit:

- `homepage.json` for homepage content
- `about.json` for about page content
- `site-config.ts` for global settings

#### 2. Edit the Content

**For JSON files** (homepage.json, about.json):

- Edit text between quotes: `"title": "Your new title here"`
- Keep all commas, brackets, and quotes intact
- Use `\n\n` for paragraph breaks in long text
- Numbers should not have quotes: `"participantCount": 15`

**For TypeScript files** (site-config.ts):

- Edit text between quotes
- Keep commas at the end of each line (except the last item in a section)
- Maintain the structure with brackets and braces

#### 3. Save the File

Save your changes in your text editor.

---

## Validation and Testing

### Before Deploying

Always validate your changes before deploying to avoid breaking the website.

#### 1. Validate JSON Syntax

**For JSON files only** (homepage.json, about.json):

1. Copy the entire file content
2. Go to https://jsonlint.com/
3. Paste your content
4. Click "Validate JSON"
5. Fix any errors shown (usually missing commas or quotes)

**Common JSON errors**:

- Missing comma after a field: `"title": "Text"` ← needs comma if not last item
- Extra comma at the end: `"title": "Text",` ← remove comma if last item
- Unmatched quotes: `"title: "Text"` ← missing opening quote
- Unmatched brackets: `[...]` or `{...}` ← must be properly closed

#### 2. Test Locally (Optional)

If you have the development environment set up:

```bash
# Navigate to frontend directory
cd apps/frontend

# Start development server
npm run dev
```

Visit http://localhost:3000 to preview your changes.

#### 3. Check for Typos

- Review all text for spelling and grammar
- Verify all links start with "/" or "https://"
- Ensure icon names are valid (check https://lucide.dev/icons/)

---

## Deployment Process

### Automatic Deployment (Recommended)

If your repository is connected to Netlify or similar service:

1. **Commit your changes** to Git:

   ```bash
   git add apps/frontend/content/
   git commit -m "Update homepage hero section"
   git push
   ```

2. **Automatic build** will trigger on Netlify

3. **Wait 2-5 minutes** for deployment to complete

4. **Verify changes** on the live website

### Manual Deployment

If deploying manually:

1. **Build the project**:

   ```bash
   cd apps/frontend
   npm run build
   ```

2. **Deploy the `out/` directory** to your hosting service

3. **Verify changes** on the live website

### Post-Deployment Checklist

After deployment, verify:

- [ ] Homepage loads correctly
- [ ] About page loads correctly
- [ ] All text appears as expected
- [ ] No broken links
- [ ] Navigation works properly
- [ ] Contact form still functions
- [ ] Mobile view looks correct

---

## Common Issues and Solutions

### Issue: Website shows blank page after update

**Cause**: JSON syntax error (missing comma, bracket, or quote)

**Solution**:

1. Validate your JSON at https://jsonlint.com/
2. Fix the syntax error shown
3. Redeploy

### Issue: Text doesn't appear on the website

**Cause**: Incorrect field name or structure

**Solution**:

1. Compare your file with the examples in this guide
2. Ensure field names match exactly (case-sensitive)
3. Verify the structure matches the required format

### Issue: Participant count shows as text instead of number

**Cause**: Number wrapped in quotes

**Solution**:
Change `"participantCount": "10"` to `"participantCount": 10` (no quotes)

### Issue: Icon doesn't display

**Cause**: Invalid icon name

**Solution**:

1. Visit https://lucide.dev/icons/
2. Find the correct icon name
3. Use the exact name shown (e.g., "user-x", not "user-cross")

### Issue: Line breaks don't work in text

**Cause**: Not using proper escape sequence

**Solution**:
Use `\n\n` for paragraph breaks:

```json
"content": "First paragraph.\n\nSecond paragraph."
```

### Issue: Changes don't appear after deployment

**Cause**: Browser cache or deployment delay

**Solution**:

1. Wait 5 minutes for deployment to complete
2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Try in incognito/private browsing mode
4. Clear browser cache

---

## Quick Reference

### File Locations

- Homepage: `apps/frontend/content/homepage.json`
- About: `apps/frontend/content/about.json`
- Config: `apps/frontend/content/site-config.ts`

### Validation Tools

- JSON Validator: https://jsonlint.com/
- Icon Library: https://lucide.dev/icons/

### Key Rules

1. Always validate JSON before deploying
2. Keep exactly 3 items for problems, values, and steps
3. Numbers don't use quotes: `10` not `"10"`
4. Use `\n\n` for paragraph breaks
5. Test on staging before production (if available)

### Getting Help

If you encounter issues not covered in this guide:

1. Check the error message carefully
2. Validate your JSON syntax
3. Compare with the examples in this guide
4. Contact the development team with:
   - What you changed
   - The error message (if any)
   - The file you edited

---

## Content Update Workflow Summary

```
1. Edit content file
   ↓
2. Validate JSON syntax (jsonlint.com)
   ↓
3. Test locally (optional)
   ↓
4. Commit and push to Git
   ↓
5. Wait for automatic deployment
   ↓
6. Verify on live website
   ↓
7. Done! ✓
```

---

**Last Updated**: November 2025  
**Version**: 1.0
