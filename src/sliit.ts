import axios from "axios";
import axiosCookieJarSupport from "axios-cookiejar-support";
import tough from "tough-cookie";
import querystring from "querystring";
import cheerio from "cheerio";
import { sleep } from "./common";
import { UsenameAssertionError } from "./sliitErrors";

axiosCookieJarSupport(axios);

export interface CourseModule {
    name: string;
    href?: string;
}

export class SliitAPI {
    cookieJar : tough.CookieJar;
    username : string;
    password : string;

    constructor(){
        this.cookieJar = new tough.CookieJar();
    }

    async login(username : string, password : string): Promise<boolean>{
        return await this._retry(async () => { return await this._login(username, password); }, this._login.name);
    }

    private async _login(username : string, password : string): Promise<boolean> {
        this.username = username;
        this.password = password;

        if(!username || !password){
            throw new Error("No Username or password");
        }

        let guestPage, loggedInPage, doc, logged;
        guestPage = await axios.get("https://courseweb.sliit.lk/", { jar: this.cookieJar, withCredentials: true });
        loggedInPage =  await axios.post("https://courseweb.sliit.lk/login/index.php?authldap_skipntlmsso=1",
                                    querystring.stringify({
                                        username:username,
                                        password:password
                                    }),{
                                    headers:{
                                        "Content-Type":"application/x-www-form-urlencoded",
                                    },
                                    jar:this.cookieJar,
                                    withCredentials: true
                                });
        doc = cheerio.load(loggedInPage.data)
        logged = this._assertLogin(doc, username);
        return logged;
    }

    private _assertLogin(root : cheerio.Root, username : string) : boolean{
        const user_string = root("#loggedin-user .usertext").text();

        if(user_string && user_string.toLowerCase().indexOf(username.toLowerCase()) > -1){
            return true;
        }else{
            return false;
        }
    }

    private async _getEnrolledModules(): Promise<Map<string,string>>{
        let res, $;
        res = await axios.get("https://courseweb.sliit.lk/my/",{ jar:this.cookieJar, withCredentials: true });
        $ = cheerio.load(res.data);
        
        
        // Assert if logged in
        if(!this._assertLogin($, this.username)){
            throw new UsenameAssertionError("Assertion Error.");
        }

        const mycourses = $("a[title='My courses'] ~ ul > li a");
        const courses : Map<string,string> = new Map();

        for(const c of mycourses){
            let elem = $(c);
            let title = elem.text();

            if(title) {
                courses.set(title, elem.attr("href"));
            }
        }
        return courses;
    }

    async getEnrolledModules(): Promise<Map<string,string>>{
        return await this._retry(this._getEnrolledModules.bind(this), this._getEnrolledModules.name);
    }

    async _retry(asyncFunc : Function, name : string) {
        let retryCount = 5;

        while(true){
            try{
                let result = await asyncFunc();
                return result;
            }catch(e){
                if(e instanceof UsenameAssertionError){
                    await this.login(this.username, this.password);
                }
                console.log(`Retrying ${name || "Unknown Function"} in 3 seconds.`);
                if(retryCount <= 0){
                    throw new Error(`${name || "Unknown Function"} faild. With :\n${e}`);
                }
                retryCount--;
                await sleep(3000);
            }
        }
    }

    async getModuleContent(m : string){
        return await this._retry(async () => { return await this._getModuleContent(m); }, this._getModuleContent.name);
    }

    private async _getModuleContent(m : string): Promise<any> {
        if(!m) {
            throw new Error("Wrong href");
        }
        let modulePage = await axios.get(m, { jar: this.cookieJar, withCredentials: true });
        const $ = cheerio.load(modulePage.data);
        
        // Assert if logged in
        if(!this._assertLogin($, this.username)){
            throw new UsenameAssertionError("Assertion Error.");
        }

        const content = $(".course-content").html();
        return content;
    }
}

export function CourseModuleToMap(arr : CourseModule[]) {
    let m = new Map();
    for(const elem of arr){
        m.set(elem.name, elem.href);
    }
    return m;
}