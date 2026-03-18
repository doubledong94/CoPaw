# Application Icons

This directory should contain application icons for different platforms.

## Required Icons

### Windows
- **icon.ico** (256x256 or multi-size ICO file)
  - Used for: .exe file, installer, taskbar, desktop shortcut
  - Create using tools like: IcoFX, GIMP, or online converters
  - Should include multiple sizes: 16x16, 32x32, 48x48, 256x256

### macOS
- **icon.icns** (512x512@2x or multi-size ICNS file)
  - Used for: .app bundle, dock, Finder
  - Create using: `iconutil` (macOS command-line tool)
  - Or online converters that generate .icns from PNG

### Linux
- **icon.png** (512x512 PNG file)
  - Used for: .AppImage, desktop entries
  - Should be high resolution PNG with transparency

## Creating Icons from CoPaw Logo

If you have the CoPaw logo (from the README):
```
https://img.alicdn.com/imgextra/i2/O1CN014TIqyO1U5wDiSbFfA_!!6000000002467-2-tps-816-192.png
```

You can convert it to the required formats:

### Using ImageMagick (command-line)

```bash
# Download logo
curl -o copaw-logo.png "https://img.alicdn.com/imgextra/i2/O1CN014TIqyO1U5wDiSbFfA_!!6000000002467-2-tps-816-192.png"

# Create square icon with padding
convert copaw-logo.png -resize 512x512 -background white -gravity center -extent 512x512 icon.png

# Create Windows ICO (requires ImageMagick with ICO support)
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Create macOS ICNS (on macOS)
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
rm -r icon.iconset
```

### Using Online Tools

1. **ICO Converter**: https://www.icoconverter.com/
2. **ICNS Converter**: https://iconverticons.com/online/
3. **Multi-format**: https://www.img2go.com/convert-to-ico

## Placeholder Icons

For now, you can use placeholder icons:

- Windows: Use any .ico file (even a generic one)
- macOS: Use any .icns file (even a generic one)
- Linux: Use any .png file (512x512 recommended)

The build will work with any valid icon file, but for production you should create proper branded icons.

## Testing Icons

After creating icons:

```bash
# On Windows, check ICO file
magick identify icon.ico

# On macOS, check ICNS file
sips -g all icon.icns

# On Linux, check PNG file
file icon.png
```

## Current Status

⚠️ **Placeholder icons needed!**

The build will fail if icon files are missing. Either:
1. Create proper icons as described above
2. Use placeholder icons temporarily
3. Comment out the `icon` field in `package.json` build config (not recommended)

To use a simple placeholder:
```bash
# Create a simple colored square as placeholder
convert -size 512x512 xc:#1890ff icon.png
convert icon.png icon.ico
# (icon.icns requires macOS tools)
```
