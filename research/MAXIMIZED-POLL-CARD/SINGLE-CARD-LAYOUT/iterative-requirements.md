
Is it possible to extract the html/css/js from the client-side code, that removes the "card-grid".
This will allow me to design a different layout for a single card, without the grid.  
But, keep the class="container" and class="layout".
The card-grid is used in the main page to display multiple cards, but I want to design a single card layout. 
Also, remove the "site-header", "tab-bar-wrap" and "tab-notice" from the html file.
Remove any js files that are not needed for the layout. 
The poll card does not need to have any functionality, just the layout. 
The card will be used to design a new layout for a single card.
Please the resulting files in: "research\MAXIMIZED-POLL-CARD\SINGLE-CARD-LAYOUT"

Perfect. Add a 1px solid black border around the class="layout" so it can easily be seen while designing.

left justify the "card-flip"

Add a 1px solid red boarder around the class="card-viewport" so it can easily be seen while designing.

In the space to the right of the class="card-viewport", add a div with a 1px solid blue border, and the text "This is the space to the right of the card-viewport".

Set the minimum width of the class="card-flip" to 375px.

I will try to describe what the requirements are for the class="space-right". 
Here it goes: if the browser windows is wide enough, the class="space-right" will occupy the remaining space to the right of the class="card-viewport".
As the browser window is resized smaller, the class="space-right" will shrink in width until it reaches the same size as the class="card-flip". 
At that point, the class="space-right" will shrink as the class="card-flip" shrinks, 
until the browser window is too small to display the class="card-flip" and the class="space-right".
When the browser window is too small to display the class="card-flip" and the class="space-right",
the class="space-right" will be rendered below the class="card-flip" and will occupy the full width of the browser window.

Okay, drop the borders that were for design purposes, and make the class="space-right" have a light gray background color.

I don't know if this is possible, 
but we would like the class="card-flip" to be centered in the class="layout" when the class="space-right" is rendered below the class="card-flip".  

To test the limit of the number of bars on a poll card, please add bars to bring the total to 50.
There are currently 7 bars, with the 7th bar having the label:
"Seventh, which is where the scroll arrows earn their keep — 3%".
Make the label for the 8th through the 50th  bars be:
"Bar Number 8,${random text from 1 to 75 characters long}"
and make the percentage for each bar from 8 through 50 be 0%.

There will now be no limit to the height of the class="card-flip". 
It will grow to fit the all the bars without the need for any class="arrow-row-down" or class="arrow-row-up" being rendered.

In the SINGLE-CARD-LAYOUT, 
Render a vertical line exactly centered between the class="card-viewport" and the class="space-right".
The line starts at the top of the class="card-viewport" and extends to the bottom of which ever class is lower, the class="card-viewport" or the class="space-right".
The style of the line is:
2px wide, solid --line (#D8DCD3)

Set the contents of the class="space-right" to be:
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent sit amet malesuada ante. Curabitur feugiat aliquet ante vel hendrerit. Vestibulum vel viverra odio. Nam accumsan, nulla nec consequat elementum, nisi nunc tempor turpis, id convallis neque ligula eu nulla. In tempus, justo id accumsan faucibus, velit elit convallis sem, a tincidunt mi ligula quis ipsum. Vestibulum quis blandit nunc. Donec quis risus magna. Nam velit diam, interdum id vestibulum in, iaculis nec lorem. Vestibulum eu dolor eu nisi varius suscipit sed eu ipsum. Nam a sagittis arcu, ut vehicula erat.

In hac habitasse platea dictumst. Cras ac erat et sapien aliquam tempus et vel dui. Nunc sed erat faucibus, convallis augue sed, volutpat orci. Quisque lacus libero, feugiat id accumsan consequat, interdum vitae metus. Aliquam sed dignissim nulla. Integer in mauris nisi. Cras purus massa, posuere quis diam quis, rutrum mollis tortor.

Phasellus neque ligula, posuere nec blandit eget, tempus et nunc. Praesent ac efficitur dolor. Sed cursus dolor et orci scelerisque finibus. Sed ac faucibus nisi, at rutrum nisi. Etiam ut eros sit amet massa ornare suscipit a eu enim. Fusce mattis, magna sit amet dictum scelerisque, ipsum libero vehicula dolor, nec pulvinar turpis leo in lacus. Suspendisse non pulvinar turpis. Curabitur feugiat justo et eros eleifend volutpat. Nam euismod leo eget mauris facilisis pellentesque. Phasellus at tincidunt magna.

Nunc tincidunt massa vel quam elementum, lacinia convallis ligula consectetur. Nam blandit sed libero eget facilisis. Vivamus cursus nibh ut pellentesque viverra. Vestibulum ultricies auctor ipsum a aliquet. Aenean tempus lacinia mauris quis faucibus. Donec non scelerisque augue, vitae dictum justo. Ut vestibulum quam quis turpis congue, vitae convallis ante imperdiet. Nulla venenatis euismod quam, vel sodales sapien sagittis ut. Aliquam nec ligula metus. Duis ut eros id nunc viverra commodo id in nisl. Nunc a est rutrum, fringilla justo eu, mollis eros. Curabitur pulvinar at metus eget mattis. Etiam aliquam, nisl quis dictum placerat, risus ipsum malesuada mauris, a condimentum massa ante non purus. Aliquam iaculis purus in risus hendrerit, vitae suscipit massa maximus.

Sed neque arcu, porta vel felis nec, varius porttitor lectus. Nam eget feugiat metus. Donec placerat libero ut turpis euismod suscipit. Donec venenatis, sem id venenatis fermentum, augue lacus tincidunt tellus, ac imperdiet diam dolor et magna. Cras lacinia venenatis mi, ut malesuada tellus. Integer venenatis, ex id faucibus lobortis, neque arcu gravida ligula, ac dapibus tortor sem nec mauris. Sed sagittis dui a augue maximus vehicula. Curabitur auctor pharetra purus, eget hendrerit purus cursus eget. Donec accumsan porttitor tincidunt.

Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nullam vulputate feugiat neque, sed sagittis sem suscipit eget. Morbi rutrum neque quis erat eleifend cursus. Morbi venenatis pretium velit, vel mollis urna iaculis ut. Quisque sed volutpat magna, quis eleifend metus. Mauris dictum, felis ac commodo blandit, ex nibh ultricies est, vitae placerat lorem est id dolor. Ut ipsum dui, tristique vel magna nec, congue finibus sapien. Etiam quis gravida eros. Quisque at posuere arcu, at interdum nunc. Integer et gravida leo. Quisque vitae metus laoreet, iaculis velit molestie, congue sapien. Donec dignissim id purus nec malesuada. Sed pharetra nulla non lectus fringilla pharetra. Sed vitae nisl sed sapien dapibus finibus. Integer eget aliquam turpis, id vulputate odio. Praesent pharetra nunc libero, in mollis lacus faucibus eget.

Nulla facilisi. In ac volutpat enim. Nunc turpis eros, fermentum eget lacus ac, semper tincidunt purus. Donec vel orci viverra, dictum velit et, iaculis justo. Pellentesque rhoncus ligula at ex maximus sodales. Donec fringilla urna sem, non tincidunt tortor varius ut. Ut non faucibus eros. Maecenas gravida sed justo id placerat. Suspendisse vel efficitur ante. Nullam facilisis velit in tortor pretium vehicula. Suspendisse potenti. Suspendisse euismod viverra mattis. Vestibulum quis ligula et sem convallis mattis ut sed elit. Aliquam lacinia est et suscipit malesuada. Quisque congue posuere turpis, vitae porta orci. Fusce viverra rhoncus eros sed gravida.

Fusce ullamcorper sodales rhoncus. Nam faucibus mauris sit amet lorem elementum scelerisque. Sed lorem erat, aliquet a dui vitae, porta ultrices velit. Suspendisse nec libero eget eros imperdiet volutpat. Praesent at dolor blandit, mollis ipsum quis, ullamcorper ipsum. Phasellus pulvinar nulla vel lacus consectetur, at consequat dolor blandit. Sed malesuada condimentum tristique. Mauris tristique neque sit amet est scelerisque mattis. Sed interdum sapien tellus, vulputate convallis lorem convallis sed. Phasellus congue justo felis, eu mattis enim aliquam sit amet.

Nullam rhoncus sapien vitae urna commodo, sed dignissim ex blandit. Integer sit amet nulla sed justo mattis mollis eu id nisl. Aenean dapibus metus et odio tincidunt malesuada. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Praesent elementum posuere maximus. Maecenas ac nunc vitae dolor eleifend venenatis. Integer vestibulum vestibulum libero, a ornare felis molestie nec. Nullam imperdiet ipsum ac enim eleifend suscipit. Nunc cursus tincidunt neque. Nulla facilisis est nibh, ut feugiat lorem luctus id. Nullam venenatis lobortis nisi, sed suscipit orci blandit at. Nam sodales volutpat purus a eleifend. Integer ac sagittis nisl. Cras congue nec neque tristique pulvinar.

Maecenas dolor tortor, varius vel tincidunt ac, rhoncus fringilla lectus. Quisque tempor quam quis gravida hendrerit. Donec cursus auctor velit, in eleifend nisi fringilla ac. Curabitur quam magna, dignissim eu diam at, commodo consequat massa. Morbi ante ex, volutpat et libero nec, ullamcorper commodo quam. Maecenas scelerisque risus id dui mollis, quis finibus leo commodo. Pellentesque mattis tellus risus, eget suscipit erat tincidunt a. Donec sit amet velit nisi. Aenean quam nunc, tincidunt eu lobortis vitae, consectetur ac enim. Mauris interdum nec elit sit amet maximus. Quisque tempus blandit arcu, sit amet faucibus lacus lacinia in. Donec tempus, metus vitae tempus aliquam, sem diam rutrum mauris, ac vulputate est metus non justo. Etiam eu magna eu nunc feugiat eleifend. Mauris quis molestie lorem.
```

Make the height of the class="space-right" grow to just fit the contents, but no more.
It does not need to be  the same height as the class="card-viewport".

what is the min and max height of a bar in the main CrowdPoll webapp?

what constants set the min and max numberof bars in the main CrowdPoll webapp?

Now, back to the SINGLE-CARD-LAYOUT, 
create constants for the min and max height of the bars in the class="card-flip" as follows:
```
// when integrating this with the main CrowdPoll webapp, 
// these constants will be removed since they are environment variables in the main CrowdPoll webapp
const ENV_MIN_CHOICES = 2; // minimum number of choices in a poll
const ENV_MAX_CHOICES = 50; // maximum number of choices in a poll
```


In the SINGLE-CARD-LAYOUT, 
use the same constants for the min and max height of the bars in the class="card-flip" as in the main CrowdPoll webapp.
```
const RESULTS_MAX_BAR_HEIGHT = 50; // cap so 2–3 bars don't grow absurdly tall
const RESULTS_MIN_BAR_HEIGHT = 25; // floor so bars stay visible at high choice counts
```
Make a function that sets the height of the bars in the class="card-flip" based on:
- the number of bars in the poll
- the RESULTS_MAX_BAR_HEIGHT and RESULTS_MIN_BAR_HEIGHT constants
- ENV_MIN_CHOICES and ENV_MAX_CHOICES
as follows:
When the number of bars is equal to ENV_MIN_CHOICES, the height of the bars is RESULTS_MAX_BAR_HEIGHT.
When the number of bars is equal to ENV_MAX_CHOICES, the height of the bars is RESULTS_MIN_BAR_HEIGHT.
When the number of bars is between ENV_MIN_CHOICES and ENV_MAX_CHOICES, the height of the bars is linearly interpolated between RESULTS_MAX_BAR_HEIGHT and RESULTS_MIN_BAR_HEIGHT.

Scale the row gap the same way.

We are going to add a temporary control to the SINGLE-CARD-LAYOUT Poll Card that will allow us to change the number of bars in the class="card-flip" 
from ENV_MIN_CHOICES to ENV_MAX_CHOICES.
Temporarily put [-] and [+] icons in the footer area, between the "Live Results" link and the "Vote" button.
Clicking "-" will decrease the number of bars by 1, down to a minimum of ENV_MIN_CHOICES.
Clicking "+" will increase the number of bars by 1, up to a maximum of ENV_MAX_CHOICES.
This will allow us to quickly validate that the Poll Card in a way that looks good for any number of bars from ENV_MIN_CHOICES to ENV_MAX_CHOICES.
```
 Removing it later  
 The control is marked "TEMPORARY" in three places, and the README lists what to delete before integrating:
  - the .bar-count-ctl markup
  - its CSS rule
  - the showBars and initBarCountControl functions
```  

Let's try making the gap between bars fixed at: 
const RESULTS_GAP_FIXED = 2;
Note: keep the row gap scaling function, but don't use it for now. We will see if we need it later.
Also, keep the 2 consts:
RESULTs_GAP_MIN and RESULTS_GAP_MAX, but don't use them for now. We will see if we need them later.

Here's an experiment with something that I don't know if it is possible, but I want to try because I may use the technique for something else later that will improve the UX.
We want give a hot key to the [-] and [+] buttons that control the number of bars in the class="card-flip" with just the keyboard, without having to click on the buttons.
Make the hot keys "-" and "+" respectively.

Looks perfect. Let's leave the [-] and [+] buttons in the footer area for now, and the hot keys associated with them.  
Now, we are going to work on the appearance of the bar in relation to the fonts.  
The technique of selecting white or black doesn't look very pleasing to the eye.  
Let's try making the font color always black with a pronouncwed white shadow. 

Much better. Please make the white shadow extend a few more pixels to the left of the text. 
Also, lets try a more pronounce3d white shadow.
And, let's try the white shadow behind all the text, from left to right.
Just to see how it looks.

Looks great.
But I want to try something else.
I am using the Polymarket website as an example. That site has similar colored bars used for voting.
see the image: designDocs/dontTrack/polymarketFonts.jpg
Every bar color is a light shade of a color and the font is a very dark shade of the same color.
The following is the array of colors proposed for the bars in the class="card-flip" in the SINGLE-CARD-LAYOUT:

```
const RESULTS_PALETTE_ENTRIES = [
  { hex: '', name: 'sky' },
  { hex: '', name: 'mint green' },
  { hex: '', name: 'pale peach' },
  { hex: '', name: 'pale lavender' },
  { hex: '', name: 'duck egg blue' },
  { hex: '', name: 'tea green' },
  { hex: '', name: 'sunny yellow' },
  { hex: '', name: 'pastel orange' },
  { hex: '', name: 'lavender pink' },
  { hex: '', name: 'baby blue' },
  { hex: '', name: 'light blue green' },
  { hex: '', name: 'light yellow green' },
  { hex: '', name: 'pale gold' },
  { hex: '', name: 'peachy pink' },
  { hex: '', name: 'light grey' },
  { hex: '', name: 'very light purple' },
  { hex: '', name: 'light grey blue' },
  { hex: '', name: 'hospital green' },
  { hex: '', name: 'apricot' },
  { hex: '', name: 'bubble gum' },
  { hex: '', name: 'pastel blue' },
  { hex: '', name: 'light teal' },
  { hex: '', name: 'light lime green' },
  { hex: '', name: 'sandy' },
  { hex: '', name: 'sand yellow' },
  { hex: '', name: 'light salmon' },
  { hex: '', name: 'blush' },
  { hex: '', name: 'pale rose' },
  { hex: '', name: 'faded pink' },
  { hex: '', name: 'pale violet' },
  { hex: '', name: 'robin egg blue' },
  { hex: '', name: 'celadon' },
  { hex: '', name: 'light khaki' },
  { hex: '', name: 'very light brown' },
  { hex: '', name: 'purply pink' },
  { hex: '', name: 'cloudy blue' },
  { hex: '', name: 'light seafoam' },
  { hex: '', name: 'kiwi' },
  { hex: '', name: 'golden yellow' },
  { hex: '', name: 'grapefruit' },
  { hex: '', name: 'rose pink' },
  { hex: '', name: 'light lavendar' },
  { hex: '', name: 'bright turquoise' },
  { hex: '', name: 'light sage' },
  { hex: '', name: 'lemon yellow' },
  { hex: '', name: 'fawn' },
  { hex: '', name: 'pink' },
  { hex: '', name: 'light periwinkle' },
  { hex: '', name: 'piss yellow' },
  { hex: '', name: 'apricot' }
];

  ```

The CrowdPoll webapp also has semantic colors for the Yes and No bars, as follows:
```
const SEMANTIC_AFFIRMATIVE_COLOR = '#66FF66';
const SEMANTIC_NEGATIVE_COLOR = '#FF6666';
```
Is it possible to use the same technique as the Polymarket website, where the font color is a very dark shade of the bar color, as defined in the RESULTS_PALETTE_ENTRIES array?
Notice that the RESULTS_PALETTE_ENTRIES array does not have the hex values for the colors, just the names.
Please write code that will assign the hex values for the colors in the RESULTS_PALETTE_ENTRIES array, and then assign a very dark shade of that color to the font color for that bar.

Looks great.
So that we can validate each color, please temporarily, set the bar fill to 50% for each bar, and the percentage text to 50% for each bar. Even though it doesn't make sense in the context of a vote, it is just to validate the color palette.
Here is a new list.
Please let me know which colors are duplicated, 
and which colors do not reach 7:1 against its own fill.






Try these for the YES and NO colors:
```
const SEMANTIC_AFFIRMATIVE_COLOR = '#019529';
const SEMANTIC_NEGATIVE_COLOR = '#cf0234';
```
And make the font on the semantic colors to be white.
Here is a revised list. I am now tweaking the order.
It is okay if colors are duplicated.
Just need to make sure they are not too dark.
```
const RESULTS_PALETTE_ENTRIES = [
  { hex: '', name: "robin's egg blue" },
  { hex: '', name: 'pale peach' },
  { hex: '', name: 'pale lavender' },
  { hex: '', name: 'lemon yellow' },
  { hex: '', name: 'powder blue' },
  { hex: '', name: 'apricot' },
  { hex: '', name: 'light rose' },
  { hex: '', name: 'pale blue' },
  { hex: '', name: 'pale gold' },
  { hex: '', name: 'light peach' },
  { hex: '', name: 'light grey' },
  { hex: '', name: 'very light purple' },
  { hex: '', name: 'light blue grey' },
  { hex: '', name: 'pastel blue' },
  { hex: '', name: 'sandy' },
  { hex: '', name: 'duck egg blue' },
  { hex: '', name: 'light salmon' },
  { hex: '', name: 'pale rose' },
  { hex: '', name: 'light peach' },
  { hex: '', name: 'robin egg blue' },
  { hex: '', name: 'light khaki' },
  { hex: '', name: 'light tan' },
  { hex: '', name: 'pale mauve' },
  { hex: '', name: 'light grey' },
  { hex: '', name: 'golden yellow' },
  { hex: '', name: 'rose pink' },
  { hex: '', name: 'butter' },
  { hex: '', name: 'light peach' },
  { hex: '', name: 'light periwinkle' },
  { hex: '', name: 'piss yellow' },
  { hex: '', name: 'pale peach' },
  { hex: '', name: 'light blue grey' },
  { hex: '', name: 'soft pink' },
  { hex: '', name: 'light blue' },
  { hex: '', name: 'light lilac' },
  { hex: '', name: 'light grey green' },
  { hex: '', name: 'light tan' },
  { hex: '', name: 'light lavendar' },
  { hex: '', name: 'silver' },
  { hex: '', name: 'light rose' },
  { hex: '', name: 'pale lilac' },
  { hex: '', name: 'pale blue' },
  { hex: '', name: 'canary' },
  { hex: '', name: 'apricot' },
  { hex: '', name: 'pale mauve' },
  { hex: '', name: "robin's egg blue" },
  { hex: '', name: 'light peach' },
  { hex: '', name: 'light tan' },
  { hex: '', name: 'duck egg blue' },
  { hex: '', name: 'lemon yellow' },
  
];
```

Now, I need to validate the appearance of Yes and No colors.
Please replace the first two colors in the RESULTS_PALETTE_ENTRIES array with the SEMANTIC_AFFIRMATIVE_COLOR and SEMANTIC_NEGATIVE_COLOR, respectively.

We need the SEMANTIC colors to be dark colors.
But the default background is light, so let's try a black font with a white shadow as we had before.
This shadow is only for the semantic colors.

For the semanic bar's font, let's try a white font with a black shadow.

It is a bit of a dilemma. 
The semantic colors are dark, so the font should be white. But the background is light, so the font should be black.
The coloring on the other bars is great, so will will leave that as is.
Do you have any suggestions?
It would probably be okay if the background of the semantic bars is a different color than the others.
Typically, a poll using the semantic colors would be a Yes/No poll, or a True/False poll, so there would only be two bars. The other bars are for polls with more than two choices.
Please make a recommendation and apply it so we can see how it looks.

Returning to work on the Poll Card layout in:
`research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT`.  
Please render the back of the Poll Card with the same layout, so that we can validate the appearance of the back.

// note: to see the back: file:///C:/code/crowdpoll02/research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT/single-card.html#back   

Put the [-] and [+] control on the back too 

To prep this to be integrated into the main CrowdPoll webapp:  
- remove the [-] and [+] control from the front and back of the Poll Card
- generate percentages for the bars in the class="card-flip" based on random numbers from 0-10, so that the total of all percentages is 100%
- keep the total number of bars at 50
- rename class="container" to class="maximized-card-container"
- rename class="card-flip" to class="maximized-card-flip"
- rename class="card-viewport" to class="maximized-card-viewport"
- rename class="space-right" to class="maximized-space-right"
- rename class="layout" to class="maximized-layout"
- keep the 50 bar labels the same as they are now
- keep the 50 bar colors the same as they are now
- keep the 50 bar font colors the same as they are now
- keep the 50 bar font shadows the same as they are now
- keep the "Lorem ipsum" text in the class="space-right" the same as it is now
- keep the vertical line between the class="card-viewport" and the class="space-right" the same as it is now
- keep the layout of the back of the Poll Card the same as it is now (without the [-] and [+] control)
- keep the layout of the front of the Poll Card the same as it is now (without the [-] and [+] control)
- keep the layout of the class="space-right" the same as it is now
- keep the layout of the class="card-viewport" the same as it is now

A change to how the random percentages are generated for the bars is needed.
Since the bars should be sorted from largest to smallest, the random percentages should be generated in a way that the first bar has the largest percentage, and the last bar has the smallest percentage. 

Please rename class="maximized-card-layout" to class="maximized-card-grid"

A "X" icon will be added to the upper right corner of the maximized Poll Card in the class="maximized-card-grid".
When the user mouses over the "X" icon, the cursor will change to a pointer to indicate that it is clickable.  
When the user clicks on the "X" icon, the maximized Poll Card will be closed and the user will return to the previous view (current tab) of the CrowdPoll webapp.
The "X" icon is the same as the "X" icon used in the main CrowdPoll webapp in class="icon-btn".
The aria-label for the "X" icon in this context is "Close Poll Card". 

We see now that the "X" icon needs to be larger in this context.
Please make it 1.5 times larger than the "X" icon used in the main CrowdPoll webapp in class="icon-btn".


=================================

Let's go back to working on the research in 
"/research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT/iterative-requirements.md" 

We have determined that the color palette of the bars are too subdued for the Maximized Poll Card.  
Let's try a new color palette that is more vibrant.  
Please adjust the colors to be darker but still essentially the same color.  
Then we will need to render the font as a much lighter shade of the same color, so that the font is readable on the darker bars.  
The current implementation selected a foint color that is a very dark shade of the bar color.  
To reiterate, the bar colors will now be vibrant dark colors, and the font color will be a light shade of the bar color.
Also, to support this, make the default background of the bar be a VERY light shade of the bar color.  
A similar technique is used for the semantic colors.  


For testing and validation, please set the percentages of each bar to 50%, as we had before.  

Please make the background color of each bar slight darker.  

Please make the background color of each bar even darker by a bit.
=============================================

Now, we are going to replace the current color palette with a new color palette that is more vibrant.
Here are the named colors for the first 10 bars.

Here is the algorithm for generating the remaining colors:
- color 11 will be a slightly lighter version of color 1
- color 12 will be a slightly lighter version of color 2
- color 13 will be a slightly lighter version of color 3
- color 14 will be a slightly lighter version of color 4
- color 15 will be a slightly lighter version of color 5
- color 16 will be a slightly lighter version of color 6
- color 17 will be a slightly lighter version of color 7
- color 18 will be a slightly lighter version of color 8
- color 19 will be a slightly lighter version of color 9
- color 20 will be a slightly lighter version of color 10
- color 21 will be a slightly lighter version of color 11
- color 22 will be a slightly lighter version of color 12
- color 23 will be a slightly lighter version of color 13
- color 24 will be a slightly lighter version of color 14
- color 25 will be a slightly lighter version of color 15
- color 26 will be a slightly lighter version of color 16
- color 27 will be a slightly lighter version of color 17
- color 28 will be a slightly lighter version of color 18
- color 29 will be a slightly lighter version of color 19
- color 30 will be a slightly lighter version of color 20
- color 31 will be a slightly lighter version of color 21
- color 32 will be a slightly lighter version of color 22
- color 33 will be a slightly lighter version of color 23
- color 34 will be a slightly lighter version of color 24
- color 35 will be a slightly lighter version of color 25
- color 36 will be a slightly lighter version of color 26
- color 37 will be a slightly lighter version of color 27
- color 38 will be a slightly lighter version of color 28
- color 39 will be a slightly lighter version of color 29
- color 40 will be a slightly lighter version of color 30
- color 41 will be a slightly lighter version of color 31
- color 42 will be a slightly lighter version of color 32
- color 43 will be a slightly lighter version of color 33
- color 44 will be a slightly lighter version of color 34
- color 45 will be a slightly lighter version of color 35
- color 46 will be a slightly lighter version of color 36
- color 47 will be a slightly lighter version of color 37
- color 48 will be a slightly lighter version of color 38
- color 49 will be a slightly lighter version of color 39
- color 50 will be a slightly lighter version of color 40

There doesn't need to be a named color for each of the 50 colors, just the hex value.
Let me know if a name for the color is required by the webapp.
``` 
const RESULTS_PALETTE_ENTRIES = [
  { hex: '', name: 'darkish blue' },
  { hex: '', name: 'dark green blue' },
  { hex: '', name: 'marigold' },
  { hex: '', name: 'rust orange' },
  { hex: '', name: 'pure blue' },
  { hex: '', name: 'black' },
  { hex: '', name: 'pink purple' },
  { hex: '', name: 'shit' },
  { hex: '', name: 'rust brown' },
  { hex: '', name: 'grey' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },

  
];
```


==============================

Looks great.
Now, for validation purposes, pleasee set the labels of Bar 1 and Bar 2 to "Yes" and "No", respectively, and set the colors of Bar 1 and Bar 2 to the SEMANTIC_AFFIRMATIVE_COLOR and SEMANTIC_NEGATIVE_COLOR, respectively.

Looks great. Now you can remove the Yes and No labels.


Please extract the current color palette from the Single Card Layout 
and write it to a new file in the research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT directory called "color-palette.md".
I will then use that file to generate a new color palette for the bars in the main CrowdPoll webapp.  
There is no need to include the SEMANTIC_AFFIRMATIVE_COLOR and SEMANTIC_NEGATIVE_COLOR in the color-palette.md file, since those colors are already defined in the main CrowdPoll webapp.  
Also, do not update the main CrowdPoll webapp with the new color palette until we have validated that the colors are acceptable for the main CrowdPoll webapp. 
At that time, I will use the speckit slash commands to methodically update the main CrowdPoll webapp with the new color palette.
What I want you to write is the RESULTS_PALETTE_ENTRIES array, with the hex values filled in for each color, and the names of the colors if there is a corresponding color to the hex value.

```
const RESULTS_PALETTE_ENTRIES = [
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },
  { hex: '', name: '' },

  
];

```


Is it possible to find the nearest match for the hex colors that have no named color, using a color distance algorithm, such as the Euclidean distance in RGB color space? 
if so, please reassign the hex values for those colors to the nearest named color, and update the RESULTS_PALETTE_ENTRIES array accordingly.
