import { Db, MongoClient } from 'mongodb';
import { SliitAPI,CourseModule,CourseModuleToMap } from './sliit';
import { compareHTML } from './domCompare';
import { TelegramClient } from './telegram';
import { sleep } from './common';
import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';

export class SyncTask {
    private rate : number;
    private username : string;
    private password : string;
    private db : Db;
    private sliit : SliitAPI;
    private tclient : TelegramClient;
    private browser : puppeteer.Browser;
    private page : puppeteer.Page;

    constructor(rate : number, username : string, password : string) {
        this.rate = rate;
        this.username = username;
        this.password = password;
    }

    setDB(db : Db){
        this.db = db;
    }

    setTclient(tclient : TelegramClient){
        this.tclient = tclient;
    }

    async init() {
        this.sliit = new SliitAPI();
        let res = await this.sliit.login(this.username, this.password);

        if(!res){
            throw new Error("Username Password error.");
        }
        
        this.browser = await puppeteer.launch({
            headless: true,
            devtools: false,
            args: ['--no-sandbox']
        });
    }

    async syncModules() {
        let oldModules : any = await this.db.collection("config").findOne({ type: "modules"});
        let newMap = await this.sliit.getEnrolledModules();
        
        let oldMap = CourseModuleToMap(oldModules.modules);

        //Assert if modules are the same
        for(let [key, value] of oldMap){
            if(newMap.has(key)){
                if(value != newMap.get(key)){
                    console.warn("None matching URLs found for " + key);
                }
            }else{
                throw Error("New Map has some values changed");
            }
        }

        let newData : CourseModule[] = [];
        newMap.forEach((val, key) => {
            newData.push({
                href:val,
                name:key
            });
        })

        await this.db.collection("config").updateOne({ type:"modules" }, { $set:{ modules: newData, updates:true } });
        return newMap;
    }

    async syncPages() {
        let data : any = await this.db.collection("config").findOne({ type: "modules"});
        //this._tlog("Page syncing started.");

        for(const m of data.modules as CourseModule[]) {
            let oldPage = await this.db.collection("current").findOne({ name:m.name, href: m.href });
            if(oldPage){
                console.log(`${m.name} Found. Checking for updates.`);
                await this._compareAndUpdate(oldPage, m);
            }else{
                console.log(`Not Found. Adding initial history for ${m.name}`);
                await this._addInitialHistory(m);
            }
        }
    }

    private async _addInitialHistory(m : CourseModule) {
        let page = await this.sliit.getModuleContent(m.href);
        await this.db.collection("current").insertOne({
            types: "history",
            name: m.name,
            href: m.href,
            html: page,
            lastUpdated: new Date()
        });
    }
    private async _printToImage(html : string){
        let id = uuidv4();
        this.page = await this.browser.newPage();
        await this.page.setContent(`
        
        <div id="capturelol" style="
            width: fit-content;
            height:fit-content;
            padding: 10px;
        ">${html}</div>
        `);
        const body = await this.page.$('#capturelol');
        await body.screenshot({ path:`tmp/${id}.png`, preferCSSPageSize:true });
        await this.page.close()
        return id;
    }

    private async _compareAndUpdate(oldPage : any, mod : CourseModule) {
        let newPageHTML = await this.sliit.getModuleContent(mod.href);
        if(!oldPage){
            console.log("Caution");
        }
        let result : any = compareHTML(oldPage.html, newPageHTML);
        // console.dir(await this.sliit.cookieJar.getCookieString("*"));
        // this.page.setCookie(this.sliit.cookieJar.toJSON());
        // this.page.goto(mod.href);
        if(result.different){
            console.log(`Things have chaged in ${mod.name}`);
            //console.dir(result.changes);
            
            let sections : any[] = [];
            let nodes : any[] = [];
            for(const change of result.changes){
                let node, html;
                switch(change.type) {
                    case 'added':
                    case 'modified':
                        node = change.after.$node.closest(".section");
                        //console.dir(node);
                        break;
                   /*  case 'removed':
                        node = change.before.$node.closest(".section"); */
                }

                if(node){
                    html = node.html();
                }
                
                if(node && !nodes.includes(html)){
                    nodes.push(html);
                    //console.log(html);
                    let id = await this._printToImage(html);
                    sections.push({
                        name:mod.name,
                        id: id
                    });
                }
            }
            // console.dir(sections);
            let changes;
            try{
                changes = result.changes.map((val : any, i : number) => {
                    return val.message;
                  });
            }catch(e){

            }
            // Push changes to database
            let doc = {
                "messages":changes,
                "newPage":newPageHTML,
                "oldPage":oldPage.html,
                "name":mod.name,
                "href":mod.href,
                "added":new Date()
            }
           
            await this.db.collection("history").insertOne(doc);
            await this.db.collection("current").updateOne({ types:"history", name:mod.name, href:mod.href },{ $set:{ html:newPageHTML, lastUpdated:new Date(), updated:true } });
        
            this.tclient.send(`${mod.name} got changed.\n${mod.href}\nHere's the changes :`);
            for(const c of sections){
                console.log(c.id);
                this.tclient.sendImage(`tmp/${c.id}.png`);
            }
            
        }else{
            console.log(`Things have not chaged in ${mod.name}`);
        }
    }

    async syncUnsent(){
        /* let res  = await this.db.collection("history").find();
        for(const d of res){
            if(!d.sent){
                this.tclient.send(`${d.name} got changed. Here's the changes : \n${d.messages.join("\n\n")}`);
                await sleep(2000);
            }
        } */
    }

    async _task() {
        await this.syncModules();
        await this.syncPages();
        //await this.syncUnsent();

        console.log("Pages synced.");
        /* try {
            
        }catch(e){
            this._tlog("Warning: Sync service stoped due to \n" + e);
        } */
    }

    async start() {
        if(!this.db && !this.tclient){
            throw new Error("SyncTask not configured");
        }
        while(true){
            await this._task();
            await sleep(10*60*1000);
        }
    }

    _tlog(msg : string){
        try{
            this.tclient.send(msg);
        }catch(e){
            console.warn("Falied to send message to Telegram with Error :\n" + e);
        }
        console.log(msg);
    }
}