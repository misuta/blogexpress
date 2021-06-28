const cookieSession = require("cookie-session");
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const { hash, compare } = require("./bc");
const csurf = require("csurf");
const path = require("path");
const favicon = require("serve-favicon");
const { resolve } = require("path");
const { decodeBase64 } = require("bcryptjs");
const db = require("./db");
const marked = require("marked");
const sanitizeHtml = require("sanitize-html");
const html2md = require("html-to-md");
var wrap = require("word-wrap");
const {
    requireLoggedInUser,
    requireLoggedOutUser,
    requireEditor,
    requireAdmin,
    loggedIn,
    admin,
} = require("./middleware");
const COOKIE_SECRET =
    process.env.COOKIE_SECRET || require("./secrets.json").COOKIE_SECRET;

app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

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

app.use(loggedIn);
app.use(admin);

app.use(csurf());
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.engine("handlebars", hb());
app.set("view engine", "handlebars");
app.use(express.static("./public"));

app.get("/", (req, res) => {
    res.redirect("/blog");
    // db.getTitles()
    //     .then((result) => {
    //         // console.log("this is result in /blog", result.rows);
    //         let titles = result.rows;
    //         res.render("blogposts", {
    //             layout: "main",
    //             titles,
    //         });
    //     })
    //     .catch((error) => {
    //         console.log("this is an error in /blog ", error);
    //     });
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
            // console.log("hashedPwd in /register", hashedPw);
            // console.log("his is req.body in registration ", req.body);
            db.addUser(
                req.body.firstname,
                req.body.lastname,
                req.body.email,
                hashedPw
            )
                .then((result) => {
                    req.session.userId = result.rows[0].id;
                    // console.log("cookie", req.session.userId);
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
                    req.session.editor = result.rows[0].editor;
                    req.session.admin = result.rows[0].admin;
                    console.log("req.session.userId", req.session.userId);
                    console.log("req.session.editor", req.session.editor);
                    console.log("req.session.admin", req.session.admin);
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

app.get("/logout", (req, res) => {
    req.session.userId = "";
    req.session.editor = "";
    req.session.admin = "";
    res.redirect("/");
});
//#####################################################blog posts####################################################

app.get("/blog", (req, res) => {
    // console.log("/blog is firing");
    if (!req.session.editor) {
        db.getTitles()
            .then((result) => {
                // console.log("this is result in /blog", result.rows);
                let titles = result.rows;
                let cookie = req.session.id;
                res.render("blogposts", {
                    layout: "main",
                    titles,
                    cookie,
                });
            })
            .catch((error) => {
                console.log("this is an error in /blog ", error);
            });
    } else {
        db.getTitles()
            .then((result) => {
                // console.log("this is result in /blog", result.rows);
                let titles = result.rows;
                let cookie = req.session.id;
                res.render("blogposts", {
                    layout: "editor",
                    titles,
                    cookie,
                });
            })
            .catch((error) => {
                console.log("this is an error in /blog ", error);
            });
    }
});

app.get("/blog/:post", (req, res) => {
    // console.log("this is params in /blog/:post", req.params);
    if (!req.session.editor) {
        db.getPost(req.params.post)
            .then((result) => {
                // console.log("this is result.rows in /blog", result.rows[0].post);
                let title = result.rows[0].title;
                let blog = marked(result.rows[0].post);
                let editor = req.session.editor;
                let id = req.params.post;
                res.render("blogpost", {
                    layout: "main",
                    id,
                    editor,
                    title,
                    blog,
                });
            })
            .catch((error) => {
                console.log("this is an error in /blog/:post ", error);
            });
    } else {
        db.getPost(req.params.post)
            .then((result) => {
                // console.log("this is result.rows in /blog", result.rows[0].post);
                let title = result.rows[0].title;
                let blog = marked(result.rows[0].post);
                let editor = req.session.editor;
                let id = req.params.post;
                res.render("blogpost", {
                    layout: "editor",
                    id,
                    editor,
                    title,
                    blog,
                });
            })
            .catch((error) => {
                console.log("this is an error in /blog/:post ", error);
            });
    }
});

app.get("/post", requireLoggedInUser, requireEditor, (req, res) => {
    // console.log("this is req.body in get /post", req.body);
    // console.log("this is req.session in /post", req.session);
    res.render("postedition", {
        layout: "main",
    });
});

app.post("/post", requireLoggedInUser, requireEditor, (req, res) => {
    // console.log(
    //     "this is req.body in post / post",
    //     req.params,
    //     req.body,
    //     req.session.userId
    // );
    console.log("this is /post firing");
    console.log("this is req.body in /post ", req.body);
    let publish = false;
    if (req.body.publish == "on") {
        publish = true;
    } else {
        publish = false;
    }
    console.log("this is publish", publish);
    db.setPost(req.body.title, req.body.blogpost, req.session.userId, publish)
        .then((result) => {
            console.log("this is blogpost in /post", result.rows[0]);
            console.log(result.rows);
            res.redirect(`/blog/${result.rows[0].id}`);
        })
        .catch((error) => {
            console.log("this is an error in /post", error);
        });
});

app.get("/edit/post/:id", requireLoggedInUser, requireEditor, (req, res) => {
    // console.log("this is edit firing");
    db.getPost(req.params.id).then((result) => {
        // console.log("this is result on /edit/post/:id", result.rows);
        let id = result.rows[0].id;
        let title = result.rows[0].title;
        let blog = wrap(result.rows[0].post);
        let editor;
        if (
            req.session.userId === result.rows[0].user_id ||
            req.session.editor
        ) {
            editor = true;
        }
        res.render("editpost", {
            layout: "editor",
            editor,
            id,
            title,
            blog,
        });
    });
});

app.post("/edit/post/:id", requireLoggedInUser, requireEditor, (req, res) => {
    // console.log("this is /edit/post/:id firing");
    // console.log("this is req.body.blogpost", req.body.blogpost);
    // console.log(
    //     "###############everything in post /edit/post/:id################### ",
    //     req.params.id,
    //     req.body.title,
    //     req.body.blogpost,
    // );
    let id = req.params.id;
    let title = req.body.title;
    let post = req.body.blogpost;
    let publish = false;
    if (req.body.publish) {
        publish = true;
    } else {
        publish = false;
    }
    // console.log(
    //     "###############everything in post /edit/post/:id################### ",
    //    id, title, post
    // );
    db.updatePost(id, title, post, publish)
        .then((result) => {
            // console.log("this is blogpost in /post", result.rows[0]);
            res.redirect(`/blog/${req.params.id}`);
        })
        .catch((error) => {
            console.log("this is an error in /post", error);
        });
});

app.get("/allposts", requireLoggedInUser, requireEditor, (req, res) => {
    console.log("this is all posts firing");
    db.getAll()
        .then((result) => {
            let titles = result.rows;
            let cookie = req.session.id;
            res.render("blogposts", {
                layout: "main",
                titles,
                cookie,
            });
        })
        .catch((error) => {
            console.log("error in /allposts", error);
        });
});

app.get(
    "/delete/post/:post",
    requireLoggedInUser,
    requireEditor,
    (req, res) => {
        console.log(
            "this is req.params.post in /delete/post/:post",
            req.params.post
        );

        db.deletePost(req.params.post).then((result) => {
            res.redirect("/");
        }).catch((error) => {
            console.log("error in delePost ", error)
        });
    }
);
//#################################Edit User############################################

app.get("/edit/user/:id", requireLoggedInUser, requireAdmin, (req, res) => {
    // console.log("this is req.params in /edit/:user ", req.params);
    let isadmin = req.session.admin;
    db.getUser(req.params.id)
        .then((result) => {
            // console.log("this is result in /edit/:user", result.rows)
            let user = result.rows[0];
            res.render("editUser", {
                layout: "main",
                isadmin,
                user,
            });
        })
        .catch((error) => {
            console.log("error in /edit/:user", error);
        });
});
app.post("/edit/user/:id", requireLoggedInUser, requireAdmin, (req, res) => {
    // console.log("################this is req.params in /edit/:user################ ", req.params);
    // console.log("################this is req.params in /edit/:user################ ", req.body);
    let isadmin = req.session.admin;
    let editor = false;
    if (req.body.editor == "on") {
        editor = true;
    } else {
        editor = false;
    }
    let admin = false;
    if (req.body.admin == "on") {
        admin = true;
    } else {
        admin = false;
    }
    // req.body = { ...req.body, admin: req.body.admin === "on" };
    db.updateUser(req.params.id, admin, editor)
        .then((result) => {
            console.log("this is req.body in updateUser", req.body);
            console.log("this is result inside updateuser", result.rows);
            db.getUser(result.rows[0].id)
                .then((results) => {
                    console.log(
                        "this is result inside getuser in updateuser",
                        results.rows
                    );
                    let user = results.rows[0];
                    res.render("editUser", {
                        layout: "main",
                        isadmin,
                        user,
                    });
                })
                .catch((error) => {
                    console.log(
                        "error in getuser inside updateuser in edit/:user",
                        error
                    );
                });
        })
        .catch((error) => {
            console.log("error in /edit/:user", error);
        });
});

//##################################################search########################################################

app.get("/search", (req, res) => {
    console.log("search is firing");
    res.render("search", {
        layout: "main",
    });
});

app.post("/search", (req, res) => {
    console.log(req.body);
    db.findUser(req.body.search)
        .then((result) => {
            console.log("this is result in search", result.rows);
            let users = result.rows;
            res.render("search", {
                layout: "main",
                users,
            });
        })
        .catch((error) => {
            console.log("error in search", error);
        });
});

app.listen(process.env.PORT || 8080, () =>
    console.log("blog up and running...")
);
