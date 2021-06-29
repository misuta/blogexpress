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
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
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
        let err = `you are missing one or more fields `;
        res.render("register", {
            layout: "main",
            err,
        });
    } else {
        hash(req.body.password).then((hashedPw) => {
            db.addUser(
                req.body.firstname,
                req.body.lastname,
                req.body.email,
                hashedPw
            )
                .then((result) => {
                    req.session.userId = result.rows[0].id;
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
            let hashFromDb = result.rows[0].password;
            compare(req.body.password, hashFromDb).then((match) => {
                if (match) {
                    req.session.userId = result.rows[0].id;
                    req.session.editor = result.rows[0].editor;
                    req.session.admin = result.rows[0].admin;
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
//####################################################Post by Author#################################################

app.get("/author/:id", (req, res) => {
    console.log("this is params in /author/:id", req.params.id);
    db.getAuthor(req.params.id)
        .then((result) => {
            console.log("this is result.rows in /author/:id ", result.rows);
            let info = result.rows;
            if (req.session.editor) {
                res.render("author", {
                    layout: "editor",
                    info,
                });
            } else {
                res.render("author", {
                    layout: "main",
                    info,
                });
            }
        })
        .catch((error) => {
            console.log("error in /author/:id ", error);
        });
});

//#####################################################blog posts####################################################

app.get("/blog", (req, res) => {
    // if (!req.session.editor) {
    db.getTitles()
        .then((result) => {
            let titles = result.rows;
            let cookie = req.session.id;
            if (req.session.editor) {
                res.render("blogposts", {
                    layout: "editor",
                    titles,
                    cookie,
                });
            } else {
                res.render("blogposts", {
                    layout: "main",
                    titles,
                    cookie,
                });
            }
        })
        .catch((error) => {
            console.log("this is an error in /blog ", error);
        });
    // } else {
    //     db.getTitles()
    //         .then((result) => {
    //             let titles = result.rows;
    //             let cookie = req.session.id;
    //             res.render("blogposts", {
    //                 layout: "editor",
    //                 titles,
    //                 cookie,
    //             });
    //         })
    //         .catch((error) => {
    //             console.log("this is an error in /blog ", error);
    //         });
    // }
});

app.get("/blog/:post", (req, res) => {
    console.log("this is req.params.post in blog/:post", req.params.post);
    db.getPost(req.params.post)
        .then((result) => {
            console.log("this is result in blog/:post ", result.rows);
            let title = result.rows[0].title;
            let info = result.rows[0];
            console.log("this is result in blog/:post ", info);
            let name = `${result.rows[0].first_name} ${result.rows[0].last_name}`;
            let blog = DOMPurify.sanitize(marked(result.rows[0].post));
            let editor = req.session.editor;
            let id = req.params.post;
            // let info = result.rows[0];
            if (req.session.editor) {
                res.render("blogpost", {
                    layout: "editor",
                    id,
                    editor,
                    title,
                    blog,
                    name,
                    info,
                });
            } else {
                res.render("blogpost", {
                    layout: "main",
                    id,
                    editor,
                    title,
                    blog,
                    name,
                    info,
                });
            }
        })
        .catch((error) => {
            console.log("this is an error in /blog/:post ", error);
        });
});

app.get("/post", requireLoggedInUser, requireEditor, (req, res) => {
    res.render("postedition", {
        layout: "main",
    });
});

app.post("/post", requireLoggedInUser, requireEditor, (req, res) => {
    let publish = false;
    if (req.body.publish == "on") {
        publish = true;
    } else {
        publish = false;
    }
    db.setPost(req.body.title, req.body.blogpost, req.session.userId, publish)
        .then((result) => {
            res.redirect(`/blog/${result.rows[0].id}`);
        })
        .catch((error) => {
            console.log("this is an error in /post", error);
        });
});

app.get("/edit/post/:id", requireLoggedInUser, requireEditor, (req, res) => {
    db.getPost(req.params.id).then((result) => {
        let id = result.rows[0].id;
        let title = result.rows[0].title;
        let publish = result.rows[0].publish;
        // let blog = wrap(result.rows[0].post, {trim: true});
        let blog = result.rows[0].post;
        console.log("this is publish in edit/post/:id ", publish);
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
            publish,
        });
    });
});

app.post("/edit/post/:id", requireLoggedInUser, requireEditor, (req, res) => {
    let id = req.params.id;
    let title = req.body.title;
    let post = req.body.blogpost;
    let publish = false;
    if (req.body.publish) {
        publish = true;
    } else {
        publish = false;
    }
    db.updatePost(id, title, post, publish)
        .then((result) => {
            res.redirect(`/blog/${req.params.id}`);
        })
        .catch((error) => {
            console.log("this is an error in /post", error);
        });
});

app.get("/allposts", requireLoggedInUser, requireEditor, (req, res) => {
    db.getAll()
        .then((result) => {
            let titles = result.rows;
            let cookie = req.session.id;
            res.render("blogposts", {
                layout: "editor",
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
        db.deletePost(req.params.post)
            .then((result) => {
                res.redirect("/");
            })
            .catch((error) => {
                console.log("error in delePost ", error);
            });
    }
);
//#################################Edit User############################################

app.get("/edit/user/:id", requireLoggedInUser, requireAdmin, (req, res) => {
    let isadmin = req.session.admin;
    db.getUser(req.params.id)
        .then((result) => {
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
    db.updateUser(req.params.id, admin, editor)
        .then((result) => {
            db.getUser(result.rows[0].id)
                .then((results) => {
                    let user = results.rows[0];
                    let alert = true;
                    res.redirect("/succeed");
                    // res.render("editUser", {
                    //     layout: "main",
                    //     isadmin,
                    //     user,
                    //     alert,
                    // });
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
app.get("/succeed", (req, res) => {
    res.render("succeed", {
        layout: "editor",
    });
});

app.get(
    "/delete/user/:id",
    requireLoggedInUser,
    requireEditor,
    (req, res) => {
        db.deletePostFromUser(req.params.id).then((result) => {
            db.deleteUser(req.params.id)
                .then((result) => {
                    res.render("deleteUser", {
                        layout: "editor",
                    });
                })
                .catch((error) => {
                    console.log("error in delete/user/:id ", error);
                });
        }).catch((error) => {
            console.log("error in delete/user/:id", error);
        })
        
    }
);
//##################################################search########################################################

app.get("/search", (req, res) => {
    res.render("search", {
        layout: "main",
    });
});

app.post("/search", (req, res) => {
    db.findUser(req.body.search)
        .then((result) => {
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
