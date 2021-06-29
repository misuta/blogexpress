const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL || "postgres:postgres:postgres@localhost:5432/blog"
);

module.exports.setPost = (title, post, user_id, publish, image) => {
    console.log(title, post, user_id, publish, image);
    const q = `INSERT INTO blog (title, post, user_id, publish, image) values($1, $2, $3, $4, $5) RETURNING *`;
    const params = [title, post, user_id, publish || false, image || null];
    return db.query(q, params);
};
module.exports.updatePost = (id, title, post, publish) => {
    const q = `UPDATE blog SET title = $2, post = $3, publish = $4 WHERE id = $1 `;
    const params = [id, title, post, publish || false];
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
    console.log("#############id######", id)
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
    const q = `SELECT id, title FROM blog where blog.publish = TRUE`;
    const params = [];
    return db.query(q, params);
};

module.exports.getAll = () =>{
    const q = `SELECT * FROM blog`;
    const params = [];
    return db.query(q, params);
}
module.exports.getAuthor = (user_id) =>{
    const q = `SELECT * FROM blog WHERE user_id = $1`;
    const params = [user_id];
    return db.query(q, params);
}

module.exports.findUser = (first_name) => {
    const q = `SELECT id, first_name, last_name, admin, editor FROM users WHERE first_name ILIKE $1 OR last_name ILIKE $1 ORDER BY first_name ASC`;
    const params = [`${first_name}%`];
    return db.query(q, params);
};

module.exports.deletePost = (id) => {
    const q = `DELETE FROM blog WHERE id = $1`;
    const params = [id]
    return db.query(q, params);
};
module.exports.deleteUser = (id) => {
    const q = `DELETE FROM users WHERE id = $1`;
    const params = [id]
    return db.query(q, params);
};
module.exports.deletePostFromUser = (id) => {
    const q = `DELETE FROM blog WHERE user_id = $1`;
    const params = [id];
    return db.query(q, params);
};