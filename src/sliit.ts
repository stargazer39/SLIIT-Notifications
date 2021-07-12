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

    async login(username : string, password : string): Promise<boolean> {
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

    private async _getEnrolledModules(): Promise<CourseModule[]>{
        let res, $;
        res = await axios.get("https://courseweb.sliit.lk/my/",{ jar:this.cookieJar, withCredentials: true });
        $ = cheerio.load(res.data);
        
        
        // Assert if logged in
        if(!this._assertLogin($, this.username)){
            throw new UsenameAssertionError("Assertion Error.");
        }

        const mycourses = $("a[title='My courses'] ~ ul > li a");
        const courses : CourseModule[] = [];

        for(const c of mycourses){
            let elem = $(c);
            let title = elem.text();

            if(title) {
                courses.push({
                    "name":title,
                    "href":elem.attr("href"),
                })
            }
        }
        return courses;
    }

    async getEnrolledModules(): Promise<CourseModule[]>{
        return await this._retry(this._getEnrolledModules.bind(this));
    }

    async _retry(asyncFunc : Function) {
        let retryCount = 5;

        while(true){
            try{
                let result = await asyncFunc();
                return result;
            }catch(e){
                if(e instanceof UsenameAssertionError){
                    await this.login(this.username, this.password);
                }
                console.log("Retrying in 3 seconds.");
                if(retryCount <= 0){
                    throw new Error("getEnrolledModules faild. Last error : " + e);
                }
                retryCount--;
                await sleep(3000);
            }
        }
    }

    async getModuleContent(m : CourseModule){
        return await this._retry(async () => { return await this._getModuleContent(m); });
    }

    private async _getModuleContent(m : CourseModule): Promise<any> {
        if(!m || !m.href) {
            throw new Error("Wrong href");
        }
        let modulePage = await axios.get(m.href, { jar: this.cookieJar, withCredentials: true });
        const $ = cheerio.load(modulePage.data);
        
        // Assert if logged in
        if(!this._assertLogin($, this.username)){
            throw new UsenameAssertionError("Assertion Error.");
        }

        const content = $(".course-content").html();
        return content;
    }
}