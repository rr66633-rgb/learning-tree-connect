"""
Generate iOS App Icon and Splash Screen from Learning Tree logo.
- App Icon: 1024x1024 with white background (no alpha for iOS)
- Splash Screen: 2732x2732 with branded gradient background and centered logo
"""
from PIL import Image, ImageDraw
import os

# Paths
LOGO_PATH = "/home/ubuntu/webdev-static-assets/learning-tree-logo.png"
ICON_OUTPUT = "/home/ubuntu/learning-tree-connect/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
SPLASH_OUTPUT_DIR = "/home/ubuntu/learning-tree-connect/ios/App/App/Assets.xcassets/Splash.imageset/"

def generate_app_icon():
    """Generate 1024x1024 app icon with white background and centered logo."""
    logo = Image.open(LOGO_PATH).convert("RGBA")
    
    # Create white background (no alpha channel for iOS)
    icon = Image.new("RGB", (1024, 1024), (255, 255, 255))
    
    # Resize logo to fit within icon with padding
    logo_size = 900  # Leave some padding
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    
    # Center the logo on the white background
    offset = (1024 - logo_size) // 2
    
    # Paste with alpha mask
    icon.paste(logo_resized, (offset, offset), logo_resized)
    
    # Save
    icon.save(ICON_OUTPUT, "PNG", quality=95)
    print(f"App icon generated: {ICON_OUTPUT}")

def generate_splash_screen():
    """Generate 2732x2732 splash screen with gradient background and centered logo."""
    size = 2732
    
    # Create a soft gradient background (light green to white - nursery friendly)
    splash = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(splash)
    
    # Create a subtle radial gradient effect (light mint green edges, white center)
    for y in range(size):
        for x in range(0, size, 4):  # Step by 4 for performance
            # Distance from center (normalized 0-1)
            dx = (x - size/2) / (size/2)
            dy = (y - size/2) / (size/2)
            dist = min(1.0, (dx*dx + dy*dy) ** 0.5)
            
            # Gradient from white (center) to light mint (edges)
            r = int(255 - dist * 15)  # 255 -> 240
            g = int(255 - dist * 5)   # 255 -> 250
            b = int(255 - dist * 10)  # 255 -> 245
            
            draw.rectangle([x, y, x+3, y], fill=(r, g, b))
    
    # Load and resize logo for splash
    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo_size = 600  # Centered, not too large
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    
    # Center the logo
    offset = (size - logo_size) // 2
    splash.paste(logo_resized, (offset, offset), logo_resized)
    
    # Save all three splash variants
    for suffix in ["", "-1", "-2"]:
        output_path = os.path.join(SPLASH_OUTPUT_DIR, f"splash-2732x2732{suffix}.png")
        splash.save(output_path, "PNG", quality=95)
        print(f"Splash screen generated: {output_path}")

if __name__ == "__main__":
    generate_app_icon()
    generate_splash_screen()
    print("\nAll iOS assets generated successfully!")
