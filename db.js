const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/blog"
);


module.exports.setPost = (title, post, user_id, image) => {
    const q = `INSERT INTO blog (title, post, user_id, image) values($1, $2, $3, $4) RETURNING *`;
    const params = [title, post, user_id, image || null ];
    return db.query(q, params);
}
module.exports.addUser = (first_name, last_name, email, password) => {
    const q = `INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING id`;
    const params = [first_name, last_name, email, password];
    return db.query(q, params);
};

module.exports.getPost = (id) => {
    const q = `SELECT * FROM blog JOIN users WHERE id = $1`;
    const params = [id];
    return db.query(q, params);
}

module.exports.getPassword = (email) => {
    const q = `SELECT * FROM users WHERE email = $1`;
    const params = [email];
    return db.query(q, params);
};

module.exports.getTitles = () => {
    const q = `SELECT id, title FROM blog`;
    const params = [];
    return db.query(q, params);
}