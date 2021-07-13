import { MongoConnect } from './mongo';
import { SliitAPI,CourseModule,CourseModuleToMap } from './sliit';
import { compareHTML } from './domCompare';
import { TelegramClient } from './telegram';
import { sleep } from './common';

export class SyncTask {
    private rate : number;
    private username : string;
    private password : string;
    private client : MongoConnect;
    private sliit : SliitAPI;
    private tclient : TelegramClient;

    constructor(rate : number, username : string, password : string, client : MongoConnect, tclient? : TelegramClient) {
        this.rate = rate;
        this.username = username;
        this.password = password;
        this.client = client;
        this.tclient = tclient;
    }

    async init() {
        this.sliit = new SliitAPI();
        let res = await this.sliit.login(this.username, this.password);

        if(!res){
            throw new Error("Sync task init Error")
        }
    }

    async syncModules() {
        let oldModules : any = await this.client.findOne("config", { type: "modules"});
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

        await this.client.updateOne("config", { type:"modules" }, { $set:{ modules: newData, updates:true } });
        return newMap;
    }

    async syncPages() {
        let data : any = await this.client.findOne("config", { type: "modules"});
        this._tlog("Page syncing started.");

        for(const m of data.modules as CourseModule[]) {
            let oldPage = await this.client.findOne("currrent", { href: m.href });
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
        await this.client.insertOne("currrent", {
            types: "history",
            name: m.name,
            href: m.href,
            html: page,
            lastUpdated: new Date()
        });
    }

    private async _compareAndUpdate(oldPage : any, mod : CourseModule) {
        let newPageHTML = await this.sliit.getModuleContent(mod.href);
        let result : any = compareHTML(oldPage.html, newPageHTML);
        if(result.diffrent){
            console.log(`Things have chaged in ${mod.name}`);
            let sections : any[] = [];
            for(const c of result.changes){
                let sect = c.after.$node.closest(".section.main");
                if(!sections.includes(sect)){
                    sections.push(sect);
                }
            }
            console.log(sections);
            let resSects, changes;
            try{
                result.changes.map((val : any, i : number) => {
                    return val.message;
                  });
                resSects = sections.map((val,i) => { return val.html() });
            }catch(e){

            }
            // Push changes to database
            let doc = {
                "sections":resSects,
                "messages":changes
            }

            await this.client.insertOne("history" ,doc);
            this.tclient.send(`${mod.name} got changed. Here's the changes : \n${JSON.stringify(doc)}`);
        }else{
            console.log(`Things have not chaged in ${mod.name}`);
        }
    }

    async _task() {
        try {
            await this.init();
            await this.syncModules();
            await this.syncPages();
            console.log("Pages synced.");
        }catch(e){
            this._tlog("Warning: Sync service stoped due to \n" + e);
        }
    }

    async start() {
        while(true){
            await this._task();
            await sleep(30*60*1000);
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