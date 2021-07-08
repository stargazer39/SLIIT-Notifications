const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");
const path = require("path"); 
const srcDir = path.join(__dirname,"src");

module.exports = {
    entry:path.join(srcDir,"index.ts"),
    mode:"production",
    target: "node",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    'ts-loader',
                ]
            }
        ]
    },
    externals: [ nodeExternals() ]
}
