const cookieSession = require("cookie-session");
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const { hash, compare } = require("./bc");
const csurf = require("csurf");
const path = require("path");
const { resolve } = require("path");
const { decodeBase64 } = require("bcryptjs");
const db = require("./db");
const marked = require("marked");
const sanitizeHtml = require("sanitize-html");
const { requireLoggedInUser, requireLoggedOutUser } = require("./middleware");
const COOKIE_SECRET =
    process.env.COOKIE_SECRET || require("./secrets.json").COOKIE_SECRET;

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

//##########################################registration#############################################################

app.get("/register", requireLoggedOutUser, (req, res) => {
    res.render("register", {
        layout: "main",
    });
});

app.post("/register", requireLoggedOutUser, (req, res) => {
    if (
        !req.body.firstname ||
        !req.body.lastname ||
        !req.body.email ||
        !req.body.password
    ) {
        let err = `  you are missing one or more fields `;
        res.render("register", {
            layout: "main",
            err,
        });
    } else {
        hash(req.body.password).then((hashedPw) => {
            console.log("hashedPwd in /register", hashedPw);
            console.log("his is req.body in registration ", req.body);
            db.addUser(
                req.body.firstname,
                req.body.lastname,
                req.body.email,
                hashedPw
            )
                .then((result) => {
                    req.session.userId = result.rows[0].id;
                    console.log("cookie", req.session.userId);
                    res.redirect("/blog");
                })
                .catch((error) => {
                    console.log("error", error);
                    let err = "the email is already in use";
                    res.render("register", {
                        layout: "main",
                        err,
                    });
                });
        });
    }
});

//###########################################login###################################################################
app.get("/login", requireLoggedOutUser, (req, res) => {
    res.render("login", {
        layout: "main",
    });
});

app.post("/login", requireLoggedOutUser, (req, res) => {
    db.getPassword(req.body.email)
        .then((result) => {
            console.log("this is results in login", result);
            let hashFromDb = result.rows[0].password;

            compare(req.body.password, hashFromDb).then((match) => {
                console.log("is the password correct?", match);
                if (match) {
                    req.session.userId = result.rows[0].id;
                    console.log("req.session.userId", req.session.userId);
                    res.redirect("/blog");
                } else {
                    let err = ` email or password incorrect `;
                    res.render("login", {
                        layout: "main",
                        err,
                    });
                }
            });
        })
        .catch((error) => {
            console.log("error in compare", error);
            let err = ` email or password incorrect `;
            res.render("login", {
                layout: "main",
                err,
            });
        });
});
//#####################################################blog posts####################################################

app.get("/blog", (req, res) => {
    console.log("/blog is firing");
   db.getTitles().then((result) => {
       console.log("this is result in /blog", result.rows);
       let titles = result.rows
       res.render("blogposts", {
           layout: "main",
           titles,
       })
   }).catch((error) => {
       console.log("this is an error in /blog ", error);
   })
});

app.get("/blog/:post", (req, res) => {
    console.log("this is params in /blog/:post", req.params);
    db.getPost(req.params.post)
        .then((result) => {
            console.log("this is result.rows in /blog", result.rows[0].post);
            let title = result.rows[0].title
            let blog = sanitizeHtml(marked(result.rows[0].post));

            res.render("blogpost", {
                layout: "main",
                title,
                blog,
            });
        })
        .catch((error) => {
            console.log("this is an error in /blog/:post ", error);
        });
});

app.get("/post", (req, res) => {
    console.log("this is req.body in get /post", req.body);
    res.render("postedition", {
        layout: "main",
    });
});

app.post("/post", (req, res) => {
    console.log(
        "this is req.body in post / post",
        req.params,
        req.body,
        req.session.userId
    );
    db.setPost(req.body.title, req.body.blogpost, req.session.userId)
        .then((result) => {
            console.log("this is blogpost in /post", result.rows[0]);
            res.redirect(`/blog/${result.rows[0].id}`);
        })
        .catch((error) => {
            console.log("this is an error in /post", error);
        });
});

//#################################markdown############################################

app.listen(process.env.PORT || 8080, () =>
    console.log("blog up and running...")
);
