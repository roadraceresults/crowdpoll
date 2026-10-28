Create html/css/js that satisfies the following requirements.  
Place the files in: "prototypes\COLOR-PALETTE-EDITOR" 

# Requirements 
There will be one page that lists all the color palettes of the CrowdPoll webapp.
This includes:

1. Automated Bar Color Palette:  
From pollCard.js  
const RESULTS_PALETTE_ENTRIES = [ ... ];  

2. Semantic Color Palette:  
From pollCard.js  
const SEMANTIC_AFFIRMATIVE_COLOR = '#??????';  
const SEMANTIC_NEGATIVE_COLOR = '#??????';

3. Manual Setting Color Palette:  
From barPalette.ts  
export const BAR_PALETTE: readonly BarPaletteColor[] = [ ... ];  

Each palette will have an appropriate heading.    
Then it will display each color on a row:
- in a bar, similar to the bar on a Poll Card*
- with its corresponding hex code displayed next to it
- and the named color (if available) displayed next to it
- a button that, when clicked, will display a color selection dialog similar to that used in MS Paint on Windows  

* The bar will be 50% with the palette color, and the remaining 50% will be the light color that the actual Poll Card bar uses.  
Use the same function the the bar uses to determine the light color for the remaining 50% of the bar.  
The bar will also a sample text that straddles both color portions of the bar, using the same algorithm to determine the text color over both bar background colors.

When a new color is selected in the color selection dialog, the dialog closes. Then the color, hex and name, in the row will be updated accordingly.  

There will be a button at the top of the page called "Generate Palletes JSON". 
When clicked, the button will open a text area that is populated with the revised color palettes in a JSON format.   
```
const RESULTS_PALETTE_ENTRIES = [ ... ];  

const SEMANTIC_AFFIRMATIVE_COLOR = '#??????';  
const SEMANTIC_NEGATIVE_COLOR = '#??????';

export const BAR_PALETTE: readonly BarPaletteColor[] = [ ... ];  
```

The purpose of this page is to allow the developers to view, edit, and generate the color palettes used in the CrowdPoll webapp in a convenient and visual manner.  
It will be a great time-saver for developers doing the tedious work of manually updating and maintaining color palettes.


# Requirements 002

Rather than retrieving the color palettes directly from the source files (pollCard.js),  
place an initial copy in palette-data.js the way you did for the const MANUAL_PALETTE_ENTRIES = [ ... ];
