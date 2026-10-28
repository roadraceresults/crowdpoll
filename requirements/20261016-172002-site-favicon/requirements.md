Start a new spec for these requirements called `20261016-172002-FAVICON`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# High-Level Requirements for Fav Icon

Create a favicon for the website.

## Requirements
- Format: two files, `favicon.svg` and `favicon.ico`.  
  Modern browsers use the SVG, which stays sharp at every size and pixel density;  
  older browsers use the ICO.  
  No separate PNGs are made.  
- Size: 16x16 px, 32x32 px, and 48x48 px for different devices and resolutions, all three held in `favicon.ico`.  
- Placement: Include in the <head> section of every page, right after the viewport `<meta>`, with two tags:  
  `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` and `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">`.  
- Accessibility: no alt text, since browsers give a favicon none and each page's `<title>` names the tab.  
  `favicon.svg` carries `<title>CrowdPoll</title>` for tools that open the file directly.  
  The pages' existing titles stay as they are.  
- Scope: link the icon from all seven pages in `src/public/`.  
  `favicon.ico` is also served at the site root, so responses without the links (JSON errors, the prototypes, the plain-text 404 replies) show it through the browser's automatic `/favicon.ico` request.  
- Canvas: the figures are centred in a square canvas, scaled to fill its width, on a transparent background, with no padding beyond 1 px at 16 px.  
- Production: `favicon.svg` is hand-authored from the brand logo's figure paths;  
  `devScripts/favicon-ico.ts` makes `favicon.ico` from it, and both icon files are committed as source.  
  The script renders the SVG with headless Microsoft Edge (`--headless --screenshot`, `--default-background-color=00000000` for a transparent background) at 16, 32 and 48 px;  
  it writes the three PNGs into the ICO behind a hand-written header.  
  The browser path comes from an environment variable, defaulting to Edge's usual install path.  
  `.gitignore` gets `!devScripts/favicon-ico.ts`.  
  No build step and no dependency are added: the script is run by hand whenever the SVG changes, and is not part of `npm run build`.  
- Out of scope: an Apple touch icon (180 px), a web app manifest, and 192 px or 512 px icons.  
- Tests: each of the seven pages, as served, has both `<link rel="icon">` tags;  
  `GET /favicon.ico` answers 200 with an icon content type;  
  `favicon.ico` holds exactly the 16, 32 and 48 px images.  

The appearance will resemble the image below:  
![Favicon Example](favicon-mockup.jpg)

The favicon shows the two figures only, as in the image, without the header logo's speech bubble.  
It uses the brand logo's colours: green `#3FB34F` in front and red `#E04A4A` behind.  