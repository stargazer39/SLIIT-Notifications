import express from "express";

const port = process.env.PORT || 4200;
const app = express();

app.get("/", (req,res) => {
    res.end("Get started with your express api!!");
});

app.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});