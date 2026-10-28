**The checklist** (cheapest test first; the result of each step says where to look next):

1. *Is the address the right network card?*   
On the PC run `ipconfig`.   
The address the phone uses (`192.168.0.145`) must belong to the Wi-Fi or Ethernet card, and the phone's own Wi-Fi address must start with the same three numbers (`192.168.0.`).  
The script lists every address of the PC, so a VPN, WSL or Hyper-V address (often `172.x.x.x` or `10.x.x.x`) may appear beside it; use the one on the phone's network.  

2. *Does the PC reach itself by that address?*  
In the PC's browser open `http://192.168.0.145:8081/prototypes/SINGLE-COLUMN-RENDERING/` (not `localhost`).  
It must load.  
If it does not, the cause is on the PC (firewall or security software); go to step 5.  

3. *Is the phone really on the PC's network?*  
On the phone: Wi-Fi on, mobile data off, no VPN app, "Private DNS" off (Android) or "Limit IP address tracking" off (iPhone), the same Wi-Fi name as the PC (not a "guest" network).  
Type the full `http://` address (some browsers add `https://`).  
Try a second browser.  
To test the network itself, open the router's page (usually `http://192.168.0.1`) on the phone:  
if that does not load either, the phone cannot see devices on the network at all (guest Wi-Fi or router "AP isolation"); stop here, this is clarification 3's case.  

4. *Does the request reach the server?*  
Restart `npm run prototypes`, load the page on the phone, and look at the console.  
A line with the phone's address means the request arrived and the problem is in the page; no line means it was stopped before Node, so the firewall or the network is the cause.  

5. *The Windows firewall* (PowerShell as Administrator; the first two commands only read):  
   - `Get-NetConnectionProfile` shows each network's `NetworkCategory`. `Public` blocks incoming connections by default, and the "allow node.exe" prompt is not shown for it; it should read `Private` for your home or office Wi-Fi.
   - To list blocking rules for `node.exe`: `Get-NetFirewallRule -Direction Inbound -Action Block -Enabled True | Where-Object { (Get-NetFirewallApplicationFilter -AssociatedNetFirewallRule $_).Program -like '*node.exe' }`.  
   A block rule wins over any allow rule, and it is the usual reason the prompt never appears (an earlier "Cancel" on the prompt creates one).  
   Disable it with `Disable-NetFirewallRule -DisplayName '<name from the list>'`.
   - To mark the network Private (changes how Windows treats that network):  
   `Set-NetConnectionProfile -InterfaceAlias '<InterfaceAlias from the first command>' -NetworkCategory Private`.
   - To allow just this port on Private networks:  
   `New-NetFirewallRule -DisplayName 'CrowdPoll prototypes 8081' -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private`.  
   Remove it later with `Remove-NetFirewallRule -DisplayName 'CrowdPoll prototypes 8081'`.
6. *Other software.*  
A third-party antivirus or firewall, or a VPN client on the PC, can block incoming connections without Windows showing anything;  
test by pausing it for a minute.
