# Reward Assets Naming Map & Upload Checklist

Use this guide to prepare and upload real image assets for stickers and badges.

## 📂 Directory Structure
- Stickers: `/public/assets/rewards/stickers/`
- Badges: `/public/assets/rewards/badges/`

## 🗺️ Naming Map

| Reward ID | Asset Filename | Expected Path |
|-----------|----------------|---------------|
| `sticker_photo_proof` | `sticker_photo_proof.png` | `/assets/rewards/stickers/sticker_photo_proof.png` |
| `sticker_field_note` | `sticker_field_note.png` | `/assets/rewards/stickers/sticker_field_note.png` |
| `sticker_weird_find` | `sticker_weird_find.png` | `/assets/rewards/stickers/sticker_weird_find.png` |
| `badge_first_mission` | `badge_first_mission.png` | `/assets/rewards/badges/badge_first_mission.png` |
| `badge_evidence_collector` | `badge_evidence_collector.png` | `/assets/rewards/badges/badge_evidence_collector.png` |
| `badge_field_notes` | `badge_field_notes.png` | `/assets/rewards/badges/badge_field_notes.png` |

## ✅ Upload Checklist

1. **Format**: All assets MUST be transparent **PNG** files.
2. **Resolution**:
   - **Stickers**: 512x512px (recommended)
   - **Badges**: 256x256px (recommended)
3. **Optimization**: Run images through an optimizer (e.g., TinyPNG) to keep file sizes low for mobile performance.
4. **Consistency**:
   - Stickers should have a consistent "sticker peel" or white border aesthetic if desired.
   - Badges should follow a consistent geometric or metallic aesthetic.
5. **Upload**: Drop the files into their respective folders in the file explorer.
6. **Activation**:
   - Open `src/data/rewardRegistry.ts`.
   - Add the `assetPath: '/assets/rewards/stickers/name.png'` property to the reward object.
   - The UI will automatically switch from placeholder chips to your real artwork.

## 🛠️ Graceful Fallbacks
The application is pre-configured to:
- Show a high-contrast placeholder if `assetPath` is missing.
- Hide the image element if the file is missing or fails to load.
- Show "watermark" background textures in The Vault even when artwork is present.
