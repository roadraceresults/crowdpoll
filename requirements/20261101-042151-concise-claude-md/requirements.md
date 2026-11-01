Start a new spec for these requirements called `20261101-042151-CONCISE-CLAUDE-MD`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

In CC CLI, when we run /usage, we see a suggestion:
```
  37%  Trim C:\crowdPoll\editing-poll-available\CLAUDE.md · 21k tokens per request
```

Please make suggestions for reducing the size of CLAUDE.md.  

Currently, CLAUDE,md give a complete description of how the Crowdpoll webapp works internally, as well as the various features and functionalities it provides.  

We could like to maintain that complete version in a file called CLAUDE_COMPLETE.md, that is to be used by developers.   

Then we would like CLAUDE.md to be a consise version that is sent with almost every request sent to the AI model.  
REducing the token count is important to improve performance and efficiency when interacting with the AI model, as well as reduce costs associated with token usage.  
The concise version should focus on the key aspects of the Crowdpoll webapp, including its main features, core functionalities, and essential internal workings, while omitting detailed explanations and less critical information.  

