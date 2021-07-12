import { MongoConnect } from './mongo';
import { SliitAPI,CourseModule,CourseModuleToMap } from './sliit';

export class SyncTask {
    private rate : number;
    private username : string;
    private password : string;
    private client : MongoConnect;
    private sliit : SliitAPI;

    constructor(rate : number, username : string, password : string, client : MongoConnect) {
        this.rate = rate;
        this.username = username;
        this.password = password;
        this.client = client;
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
            console.log(key,value);
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
}

export function startSync() {

}