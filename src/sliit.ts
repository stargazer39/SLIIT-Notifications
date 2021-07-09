import axios from "axios";
import axiosCookieJarSupport from "axios-cookiejar-support";
import tough from "tough-cookie";
import querystring from "querystring";
import cheerio from "cheerio";

axiosCookieJarSupport(axios);

export interface CourseModule {
    name: string;
    href?: string;
}

export class SliitAPI {
    cookieJar : tough.CookieJar;
    logged : boolean = false;
    username : string;
    password : string;

    constructor(){
        this.cookieJar = new tough.CookieJar();
    }

    login(username : string, password : string){
        this.username = username;
        this.password = password;

        return new Promise((resolve ,reject) => {
            // Get the default cookie to the cookie jar
            axios.get("https://courseweb.sliit.lk/", {
                jar: this.cookieJar,
                withCredentials: true,
            })
            .then(() => {
                // Send username and password with POST
                axios.post("https://courseweb.sliit.lk/login/index.php?authldap_skipntlmsso=1",
                 querystring.stringify({
                    username:username,
                    password:password
                 }),{
                    headers:{
                        "Content-Type":"application/x-www-form-urlencoded",
                    },
                    jar:this.cookieJar,
                    withCredentials: true
                }).then((data) => {
                    // Assert if user logged in
                    const doc = cheerio.load(data.data)
                    let logged = this._assertLogin(doc, username);
                    if(logged){
                        // Resolve
                        this.logged = true;
                        resolve(true);
                        return;
                    }else{
                        this.logged = false;
                        reject("Wrong username or password?");
                        return;
                    }
                }).catch(() => {
                    console.log("Login failed.");
                    this.logged = false;
                    reject("Login failed.");
                    return;
                })
            })
            .catch(() => {
                console.log("Connection faild.");
                this.logged = false;
                reject("Connection faild.");
                return;
            });
        });
    }
    private _assertLogin(root : cheerio.Root, username : string) : boolean{
        const user_string = root("#loggedin-user .usertext").text();

        if(user_string && user_string.toLowerCase().indexOf(username.toLowerCase()) > -1){
            return true;
        }else{
            return false;
        }
    }
    getEnrolledModules() :  Promise<CourseModule[]> {
        return new Promise((resolve, reject) =>{
            if(!this.logged){
                reject("No one logged in. Run login() first.");
                return;
            }
            
            axios.get("https://courseweb.sliit.lk/my/",{
                jar:this.cookieJar,
                withCredentials: true
            }).then((res) => {
                const $ = cheerio.load(res.data);
                // Assert if logged in
                if(!this._assertLogin($, this.username)){
                    reject("Login error. getEnrolledModules");
                    return;
                }

                const mycourses = $("a[title='My courses'] ~ ul > li a");
                const courses : CourseModule[] = [];
                
                for(const c of mycourses){
                    let elem = $(c);
                    courses.push({
                        "name":elem.text(),
                        "href":elem.attr("href"),
                    })
                }
                resolve(courses);
            })
            .catch((e) => {
                reject(e);
                return;
            })
        });
    }
    getModuleContent(module : CourseModule): Promise<any> {
        return new Promise((resolve, reject) => {
            if(!module.href){
                reject("No href in module");
                return;
            }
            axios.get(module.href, {
                jar: this.cookieJar,
                withCredentials: true
            }).then((res) => {
                const $ = cheerio.load(res.data);
                // Assert if logged in
                if(!this._assertLogin($, this.username)){
                    reject("Login error. getModuleContent");
                    return;
                }

                const content = $(".course-content").html();
                resolve(content);
                return;
            })
            .catch((e) => {
                reject(e);
            });
        })
    }
}