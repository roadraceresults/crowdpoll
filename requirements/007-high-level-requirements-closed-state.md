start a new spec for these requirements called 007-closed-state
On the home page that displays all the Polls:
when a poll is in the "Closed" state, the "Live Results" link and the "Vote" button are not displayed.
Instead a message will be displayed, "Poll closed on <YYYY-MM-DD>" in the position where the "Live Results" link is, and in the fame font and style.
Dates will be displayed in the local timezone of the user viewing the Poll.
In the case that a Poll "just" expired and the "Vote" button is visible and clicked, the backside of the "Poll Card" where voting is done will display a message "This Poll closed on <YYYY-MM-DD>", and the "Submit Vote" button will be hidden, and the "Choices" bars will not be displayed. 
And then as the final fail-safe, if the Poll "Closed" after the backside of the "Poll Card" is rendered but before the "Submit Vote" button is clicked, the vote will not be counted and the front of the "Poll Card" will display the Poll Closed message as usual. The check for whether the Poll has closed on a "Submit Vote" and the vote will be discarded, will be done on the server-side.