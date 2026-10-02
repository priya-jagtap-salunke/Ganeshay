# Bappaji app brochures

| File | Pages | Use |
|------|-------|-----|
| `bappaji-premium-brochure-10pg.html` | **10** | **Premium publicity** — Problem → Solution → CTA |
| `bappaji-app-brochure.html` | 4 | Shorter staff guide (Marathi-heavy) |

## Export PDF

1. Open the HTML file in **Chrome** or **Edge**.
2. Click **Export PDF** (or `Ctrl+P` → Save as PDF).
3. Paper: **A4**, margins: **None** or **Minimum**.

## Add real screenshots

Replace gray placeholder boxes:

- Edit HTML: add `<img src="screenshots/home.png" alt="" />` inside `.visual` divs, or
- Import PDF into **Canva** and overlay phone screenshots on each page.

## Suggested screenshots (page 7)

1. New Booking form  
2. Payment section / success dialog  
3. Receipt screen  
4. Reports + Download Excel  

## Page 10 — customize

- Replace `your@email.com` and WhatsApp `href`
- Generate QR (APK link or bappaji.com) and paste image into `.qr-box`
- Replace `YOUR LOGO HERE` on cover (or use `<img>` in `.logo-box`)
