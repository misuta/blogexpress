module.exports.requireLoggedInUser = (req, res, next) => {
    if (!req.session.userId && req.url != "/login" && req.url != "/register") {
        res.redirect("/register");
    } else {
        next();
    }
};

module.exports.requireLoggedOutUser = (req, res, next) => {
    if (req.session.userId) {
        res.redirect("/blog");
    } else {
        next();
    }
};

module.exports.requireAdmin = (req, res, next) => {
    if (!req.session.admin) {
        res.redirect("/blog");
    } else {
        next();
    }
};

module.exports.requireEditor = (req, res, next) => {
    if (!req.session.editor) {
        res.redirect("/blog");
    } else {
        next();
    }
};
