const cookieSession = require("cookie-session");
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const { hash, compere } = require("./bc");
const csurf = require("csurf");
const path = require("path");
const { resolve } = require("path");
const { decodeBase64 } = require("bcryptjs");
const db = require("./db");
const COOKIE_SECRET = process.env.COOKIE_SECRET || require("./secrets.json").COOKIE_SECRET;



app.use(
    cookieSession({
        secret: COOKIE_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        sameSite: "strict",
    })
);

app.use(
    express.urlencoded({
        extended: false,
    })
);

app.use(csurf());
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.engine("handlebars", hb());
app.set("view engine", "handlebars");
app.use(express.static("./public"));

app.get("/", (req, res) => {
    res.render("blogpost", {
        layout: "main",
    });
});

app.get("/post", (req, res) => {
    console.log("this is req.body in get /post", req.body)
    res.render("postedition", {
        layout: "main",
    })
});

app.post("/post", (req, res) => {
    console.log("this is req.body in post / post", req.body);

})


//#################################markdown############################################



app.listen(process.env.PORT || 8080, () =>
    console.log("blog up and running...")
);
