The purpose of these requirements are to update the "Edit Poll" page that an Admin has access to.   
The method of entering "Choices" will be completely updated to make it easier for the user.  
  
There is a reference implementation found in "./designDocs/smart-textbox.html".  
From the smart-textbox.html file, the textbox, labels and "Save Choices" button will be ported to the "Poll Admin" page.
Those elements will replace the existing "Choices" textbox, "Remove" buttons and the "Add Choice" button.  
In the reference implementation, the Choices are in a local variable called savedChoices array.  
That array will be replaced by the poll.choices from the existing implementation.  

A screenshot of the reference implementation is seen in "./designDocs/poll-choices-textbox.jpg".  
The styling should be adjusted to match the current styling of the "Edit Poll" page.

