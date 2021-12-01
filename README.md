# Welcome to SLIIT Notifications project

This is a Telegram bot that made to notify the changes happening in SLIIT Courseweb module pages. The bot will periodically download all the Courseweb module pages and compare them to a existing database of old module pages and send noifications to Telegram groups.

**This project is written in TypeScript**

To start running your own bot :
 * Make a folder called tmp and add a credentials.json file inside. Format as follows :
 <br>(This might change in next commits)
 ```json
 {
    "username":"[SLIIT Username]",
    "password":"[SLIIT Password]",
    "url":"[Your modgodb URI -- mongodb+srv://]",
    "botToken":"[Telegram bot token]"
}
```
* Then
```
npm run build && npm start
```

This bot is live at 
https://t.me/courseweb_notifications<br>
* Only 2021 Y2S1 modules are currently being notified. Adding multiple years notifications is in work.<br>
* Currently not accepting any PRs. If you have any suggesions/issues open a issue.

<a href="https://www.digitalocean.com/?refcode=f9522bfb36b4&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge"><img src="https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%201.svg" alt="DigitalOcean Referral Badge" /></a>
