const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL || "postgres:postgres:postgres@localhost:5432/blog"
);

module.exports.setPost = (title, post, user_id, image) => {
    const q = `INSERT INTO blog (title, post, user_id, image) values($1, $2, $3, $4) RETURNING *`;
    const params = [title, post, user_id, image || null];
    return db.query(q, params);
};
module.exports.updatePost = (id, title, post) => {
    const q = `UPDATE blog SET title = $2, post = $3 WHERE id = $1 `;
    const params = [id, title, post];
    return db.query(q, params);
};
module.exports.updateUser = (id, admin, editor) => {
    const q = `UPDATE users SET admin = $2, editor = $3 WHERE id = $1 RETURNING *`;
    const params = [id, admin, editor];
    return db.query(q, params);
};
// module.exports.updateAdmin = (id, admin) => {
//     const q = `UPDATE users SET admin = $2 WHERE id = $1 `;
//     const params = [id, admin];
//     return db.query(q, params);
// };
module.exports.addUser = (first_name, last_name, email, password) => {
    const q = `INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING id`;
    const params = [first_name, last_name, email, password];
    return db.query(q, params);
};

module.exports.getPost = (id) => {
    const q = `SELECT * FROM blog JOIN users ON (blog.user_id = users.id) WHERE blog.id = $1`;
    const params = [id];
    return db.query(q, params);
};
module.exports.getUser = (id) => {
    const q = `SELECT * FROM users WHERE id = $1`;
    const params = [id];
    return db.query(q, params);
};

module.exports.getPassword = (email) => {
    const q = `SELECT * FROM users WHERE email = $1`;
    const params = [email];
    return db.query(q, params);
};

module.exports.getTitles = () => {
    const q = `SELECT id, title FROM blog`;
    const params = [];
    return db.query(q, params);
};
