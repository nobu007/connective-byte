# Visual Assets

This directory contains all visual assets for the ConnectiveByte website.

## Logo Assets

### `logo.svg` (180x40px)

- Full horizontal logo with icon and text
- Used in desktop navigation header
- Colors: Deep blue (#1e3a8a) to tech green (#10b981) gradient
- Represents connected nodes symbolizing collective intelligence

### `logo-icon.svg` (40x40px)

- Icon-only version of the logo
- Used for favicon and mobile displays
- Circular design with connected nodes pattern
- Gradient background from deep blue to tech green

## Hero Section

### `hero-pattern.svg` (1920x1080px)

- Background pattern for hero section
- Combines gradient, dot pattern, and network visualization
- Optimized SVG for fast loading
- Represents connectivity and collective intelligence themes

## Open Graph Images

### `og-image.jpg` (1200x630px, 24KB)

- Primary Open Graph image for social media sharing
- JPG format for maximum compatibility
- Contains brand name, tagline, and value propositions

### `og-image.webp` (1200x630px, 9.8KB)

- WebP optimized version (59% smaller than JPG)
- Modern browsers automatically use this format
- Same visual content as JPG

### `og-image.avif` (1200x630px, 8.6KB)

- AVIF optimized version (64% smaller than JPG)
- Best compression, supported by modern browsers
- Same visual content as JPG

### `og-image.svg` (1200x630px, 4KB)

- Vector source file for OG image
- Used to generate raster formats
- Editable for future updates

## Image Optimization

All raster images are provided in multiple formats for optimal performance:

1. **AVIF** - Best compression, modern browsers (Chrome 85+, Firefox 93+)
2. **WebP** - Good compression, wide support (Chrome 23+, Firefox 65+, Safari 14+)
3. **JPG/PNG** - Fallback for older browsers

### Usage with OptimizedImage Component

```tsx
import { OptimizedImage } from '@/components/ui/OptimizedImage';

<OptimizedImage src="/images/og-image.jpg" alt="ConnectiveByte" width={1200} height={630} />;
```

The component automatically serves the best format supported by the user's browser.

## File Size Comparison

| Format | Size  | Savings |
| ------ | ----- | ------- |
| JPG    | 24KB  | -       |
| WebP   | 9.8KB | 59%     |
| AVIF   | 8.6KB | 64%     |

## Design Guidelines

### Colors

- **Primary Deep Blue**: #1e3a8a (Trust, intelligence, depth)
- **Tech Green**: #10b981 (Innovation, growth, future)
- **Accent Orange**: #f97316 (Energy, creativity, action)
- **Vivid Purple**: #a855f7 (Innovation, transformation)

### Logo Usage

- Minimum size: 120px width for full logo
- Clear space: Minimum 10px around logo
- Do not modify colors or proportions
- Use on white or light backgrounds for best contrast

### Icon Symbolism

The connected nodes pattern represents:

- Central node: Collective intelligence hub
- Surrounding nodes: Individual contributors
- Connection lines: Knowledge flow and collaboration
- Gradient: Transformation from individual (blue) to collective (green)

## Updating Assets

To update visual assets:

1. Edit SVG source files in this directory
2. For raster images, regenerate optimized formats:

   ```bash
   # Generate WebP
   convert source.jpg -quality 90 output.webp

   # Generate AVIF
   convert source.jpg -quality 85 output.avif
   ```

3. Maintain consistent naming: `[name].jpg`, `[name].webp`, `[name].avif`
4. Update this README if adding new assets

## Requirements Satisfied

- **Requirement 7.3**: Image optimization implemented (WebP/AVIF formats)
- **Requirement 9.5**: Descriptive alt text and proper image attributes
- Logo added to navigation (previously text-only)
- Hero background pattern created
- All images optimized for web performance
