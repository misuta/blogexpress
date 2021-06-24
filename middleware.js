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

// module.exports.requireNoSignature = (req, res, next) => {
//     if (req.session.signed) {
//         res.redirect("/thanks");
//     } else {
//         next();
//     }
// };

// module.exports.requireSignature = (req, res, next) => {
//     if (!req.session.signed) {
//         res.redirect("/petition");
//     } else {
//         next();
//     }
// };
