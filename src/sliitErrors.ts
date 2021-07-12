export class UsenameAssertionError extends Error {
    isSliitError : boolean = true;
    constructor(error : string){
        super(error);
    }
}