#!/usr/bin/env python3
from PIL import Image, ImageDraw

# Create simple icons with image symbol
sizes = [16, 48, 128]
base_color = (102, 126, 234)  # Purple from extension

for size in sizes:
    # Create image with solid background
    img = Image.new('RGBA', (size, size), base_color + (255,))
    draw = ImageDraw.Draw(img)
    
    # Draw white picture/image icon
    margin = max(1, size // 8)
    
    # Draw frame rectangle
    frame_width = max(1, size // 16)
    draw.rectangle(
        [(margin, margin), (size - margin, size - margin)],
        outline='white',
        width=frame_width
    )
    
    # Draw circle (sun/photo element)
    circle_r = max(1, size // 7)
    cx = margin + size // 4
    cy = margin + size // 4
    draw.ellipse(
        [(cx - circle_r, cy - circle_r), (cx + circle_r, cy + circle_r)],
        fill='white'
    )
    
    # Draw simple hills/mountains at bottom
    h_y = size - margin - size // 6
    draw.polygon([
        (margin + size // 6, h_y),
        (margin + size // 3, h_y - size // 8),
        (size - margin - size // 6, h_y - size // 10),
        (size - margin, h_y)
    ], fill='white')
    
    # Save
    output = f'/private/var/www/1688-image-grabber/assets/icon-{size}.png'
    img.save(output, 'PNG')
    print(f'✅ Created {output}')
